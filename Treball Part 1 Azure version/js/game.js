// game.js — versión optimizada (menos lag)

// --- Variables globales ---
let idJoc = null;
let idJugador = null;
let numJugador = null;

let joinTime = null;   // instante en el que este cliente sabe qué jugador es


let Player1;
let Player2;

let p1_points = 0;
let p2_points = 0;

let circle = { x: 0, y: 0, radius: 15, visible: false };

let netStatusTimer = null;     // intervalo para leer estado
let netMoveTimer = null;       // intervalo para enviar movimiento
let circleInterval = null;     // intervalo para crear círculo (solo J1)

// Para throttling de movimiento
const NET_MOVE_HZ = 50;        // 10 Hz (cada 100 ms) es suficiente
const NET_STATUS_HZ = 6;       // ~3 Hz para estado general
const MOVE_EPS = 1.5;          // umbral de cambio

let lastSentX = null;
let lastSentY = null;

// --- Sprites de los jugadores ---
const player1Sprites = [];
const player2Sprites = [];

// Cargamos frames 0..8 para cada jugador
for (let i = 0; i <= 8; i++) {
  const img1 = new Image();
  img1.src = `img/megaman_run_${i}.png`;
  player1Sprites.push(img1);

  const img2 = new Image();
  img2.src = `img/2megaman_run_${i}.png`;
  player2Sprites.push(img2);
}

// --- Sprite de la pelota ---
const ballImage = new Image();
ballImage.src = "img/ball.png";   // cambia el nombre si tu PNG se llama distinto


// --- Inicio del juego ---
function startGame() {
  Player1 = new component(30, 30, "red", 10, 120, false);
  Player2 = new component(30, 30, "blue", 300, 120, true);

  myGameArea.start();

  // Círculo inicial local (el servidor lo sobreescribirá con el real)
  createCircleLocal();

  // Solo el Jugador 1 generará nuevos círculos cuando no haya uno visible
  // (seguiremos sincronizados porque persistimos circle_x/y en servidor)
  circleInterval = setInterval(() => {
    if (numJugador === 1 && !circle.visible) {
      createCircleAndSync();
    }
  }, 2000);

  addNetStatsLabel();        // añade el marcador a la UI
  startLatencyMonitor();     // empieza a medir el ping
  unirseAlJoc();
}

// --- Lienzo ---
const myGameArea = {
  canvas: document.createElement("canvas"),
  start: function () {
    this.canvas.width = 480;
    this.canvas.height = 270;
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.body.childNodes[0]);
    this.interval = setInterval(updateGameArea, 20); // ~50 FPS
  },
  clear: function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
};

// --- Entidad base ---
function component(width, height, color, x, y, isPlayer2 = false) {
  this.width = width;
  this.height = height;
  this.speedX = 0;
  this.speedY = 0;
  this.x = x;
  this.y = y;

  // Animación
  this.sprites = isPlayer2 ? player2Sprites : player1Sprites;
  this.frameIndex = 0;      // 0 = idle, 1..8 = correr
  this.frameTimer = 0;      // ms acumulados para cambiar de frame
  this.facing = 1;          // 1 = derecha, -1 = izquierda

  this.updateAnimation = function (dtMs) {
    const moving = (this.speedX !== 0 || this.speedY !== 0);

    // Dirección según movimiento horizontal
    if (this.speedX > 0) this.facing = 1;
    else if (this.speedX < 0) this.facing = -1;

    if (moving) {
      // Ciclo entre 1 y 8 cuando se mueve
      this.frameTimer += dtMs;
      if (this.frameTimer > 80) { // cambiar cada 80 ms aprox.
        this.frameTimer = 0;
        this.frameIndex++;
        if (this.frameIndex > 8) this.frameIndex = 1;
      }
    } else {
      // Quieto → frame 0
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
  };

  this.update = function () {
    const ctx = myGameArea.context;

    const spritesOk = this.sprites && this.sprites.length > 0 && this.sprites[0].complete;
    if (spritesOk) {
      const img = this.sprites[this.frameIndex] || this.sprites[0];

      ctx.save();
      // Si mira a la derecha, dibujamos normal.
      // Si mira a la izquierda, escalamos en X = -1 y compensamos la posición.
      if (this.facing === 1) {
        ctx.translate(this.x, this.y);
        ctx.scale(1, 1);
      } else {
        ctx.translate(this.x + this.width, this.y); // origen al borde derecho
        ctx.scale(-1, 1);
      }

      ctx.drawImage(img, 0, 0, this.width, this.height);
      ctx.restore();
    } else {
      // Fallback: si aún no han cargado las imágenes, dibujar un rectángulo
      ctx.fillStyle = color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  };

  this.newPos = function () {
    this.x += this.speedX;
    this.y += this.speedY;
    // Limitar dentro del canvas
    if (this.x < 0) { this.x = 0; this.speedX = 0; }
    if (this.x + this.width > myGameArea.canvas.width) {
      this.x = myGameArea.canvas.width - this.width; this.speedX = 0;
    }
    if (this.y < 0) { this.y = 0; this.speedY = 0; }
    if (this.y + this.height > myGameArea.canvas.height) {
      this.y = myGameArea.canvas.height - this.height; this.speedY = 0;
    }
  };
}


// --- Bucle de render ---
function updateGameArea() {
  myGameArea.clear();

  const ctx = myGameArea.context;
  const dt = 20; // intervalo del setInterval

  // Actualizar animación
  if (Player1 && Player1.updateAnimation) Player1.updateAnimation(dt);
  if (Player2 && Player2.updateAnimation) Player2.updateAnimation(dt);

  // Movimiento y dibujado de jugadores
  Player1.newPos();
  Player1.update();

  Player2.newPos();
  Player2.update();

  // ==== MARCA VISUAL DEL JUGADOR LOCAL ====
  // usamos == para que funcione si numJugador es "1"/"2" (string) o número
  if (numJugador == 1 || numJugador == 2) {
    const pl = (numJugador == 1) ? Player1 : Player2;

    // Recuadro alrededor de tu personaje
    ctx.save();
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 3;
    ctx.strokeRect(pl.x - 4, pl.y - 4, pl.width + 8, pl.height + 8);
    ctx.restore();

    // Texto "TÚ" encima de tu personaje
    ctx.save();
    ctx.fillStyle = 'yellow';
    ctx.font = '14px Arial';
    ctx.fillText('TÚ', pl.x + pl.width / 2 - 10, pl.y - 10);
    ctx.restore();
  }
  // ========================================

  // Círculo
  drawCircle();

  // Colisiones y puntos (local)
  if (checkCollision(Player1)) {
    if (circle.visible) {
      circle.visible = false;
      // avisar al servidor que el círculo ya no está
      enviarPuntoAlServidor();
    }
    p1_points += 1;
    document.getElementById("p1_score").innerText = p1_points;
  }
  if (checkCollision(Player2)) {
    if (circle.visible) {
      circle.visible = false;
      // avisar al servidor que el círculo ya no está
      enviarPuntoAlServidor();
    }
    p2_points += 1;
    document.getElementById("p2_score").innerText = p2_points;
  }

  // Pintar puntuación
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("P1: " + p1_points, 10, 20);
  ctx.fillText("P2: " + p2_points, 400, 20);

  // Info de qué jugador eres
  if (numJugador == 1 || numJugador == 2) {
    ctx.fillStyle = "orange";
    ctx.font = "14px Arial";
    const lado = (numJugador == 1) ? "izquierda" : "derecha";
    ctx.fillText(`Tú eres J${numJugador} (${lado})`, 10, 40);
  }

  // Condición de victoria local
  if (p1_points >= 10 || p2_points >= 10) {
    clearInterval(myGameArea.interval);
    clearInterval(circleInterval);
    if (netStatusTimer) clearInterval(netStatusTimer);
    if (netMoveTimer) clearInterval(netMoveTimer);

    ctx.fillStyle = "green";
    ctx.font = "32px Arial";
    const winner = p1_points >= 10 ? "¡Gana el Jugador 1!" : "¡Gana el Jugador 2!";
    ctx.fillText(winner, 120, 140);
  }
}


// --- Alta en el juego ---
function unirseAlJoc() {
  fetch(`game.php?action=join&game_name=${encodeURIComponent(idJoc)}&circle_x=${Math.round(circle.x)}&circle_y=${Math.round(circle.y)}`, {
    method: 'GET',
    cache: 'no-store'
  })

    .then(r => r.json())
    .then(data => {
      idJoc = data.game_id;
      idJugador = data.player_id;
      numJugador = data.num_jugador;

      // Sincronizar círculo inicial desde servidor
      if (Number.isFinite(data.circle_x) && Number.isFinite(data.circle_y)) {
        circle.x = Number(data.circle_x);
        circle.y = Number(data.circle_y);
        circle.visible = true;
      }

      // Marca el momento de unión y muestra info
      joinTime = Date.now();
      mostrarInfoJugador();   // <-- nueva función

      // Arrancar bucles de red
      arrancarRed();
    })
    .catch(console.error);
}

// --- Red estable: un intervalo para estado y otro para movimiento ---
function arrancarRed() {
  // Poll de estado (3 Hz aprox.)
  if (netStatusTimer) clearInterval(netStatusTimer);
  netStatusTimer = setInterval(comprovarEstatDelJoc, Math.round(50 / NET_STATUS_HZ));

  // Envío de movimiento (10 Hz aprox., sólo si cambia)
  if (netMoveTimer) clearInterval(netMoveTimer);
  netMoveTimer = setInterval(enviarMovimentSiCambio, Math.round(50 / NET_MOVE_HZ));
}

// --- Leer estado del servidor ---
function comprovarEstatDelJoc() {
  if (!idJoc) return;

  fetch(`game.php?action=status&game_id=${idJoc}`, { method: 'GET', cache: 'no-store' })
    .then(response => response.json())
    .then(joc => {
      if (joc.error) {
        console.warn(joc.error);
        return;
      }


      // Posiciones del otro jugador
      if (numJugador == 1) {
        if (joc.player2_x != null && joc.player2_y != null) {
          Player2.x = Number(joc.player2_x);
          Player2.y = Number(joc.player2_y);
        }
      } else {
        if (joc.player1_x != null && joc.player1_y != null) {
          Player1.x = Number(joc.player1_x);
          Player1.y = Number(joc.player1_y);
        }
      }
      // Círculo desde servidor
      if (joc.circle_x !== null && joc.circle_y !== null) {
        circle.x = Number(joc.circle_x);
        circle.y = Number(joc.circle_y);
        circle.visible = true;
      } else {
        circle.visible = false;
      }

      if (typeof joc.points_player1 !== "undefined" && typeof joc.points_player2 !== "undefined") {
        p1_points = Number(joc.points_player1);
        p2_points = Number(joc.points_player2);
        document.getElementById("p1_score").innerText = p1_points;
        document.getElementById("p2_score").innerText = p2_points;
      }

    })
    .catch(console.error);

  // Círculo desde servidor (autoridad)
  if (joc.circle_x !== null && joc.circle_y !== null) {
    circle.x = Number(joc.circle_x);
    circle.y = Number(joc.circle_y);
    circle.visible = true;
  } else {
    // servidor indica que no hay círculo activo
    circle.visible = false;
  }
}

// --- Enviar movimiento sólo si cambió lo suficiente ---
function enviarMovimentSiCambio() {
  if (!idJoc || !numJugador) return;

  const px = Math.round(numJugador === 1 ? Player1.x : Player2.x);
  const py = Math.round(numJugador === 1 ? Player1.y : Player2.y);

  if (lastSentX === null || Math.abs(px - lastSentX) > MOVE_EPS || Math.abs(py - lastSentY) > MOVE_EPS) {
    lastSentX = px;
    lastSentY = py;

    const body = new URLSearchParams();
    body.set('game_id', idJoc);
    body.set('player_x', String(px));
    body.set('player_y', String(py));

    fetch('game.php?action=movement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store'
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) console.warn(data.error);
      })
      .catch(console.error);
  }
}

// --- Entradas de teclado (ajustan velocidad, no envían red) ---
document.addEventListener("keydown", function (event) {
  switch (event.key.toLowerCase()) {
    case "w": moveup(); break;
    case "a": moveleft(); break;
    case "s": movedown(); break;
    case "d": moveright(); break;
  }
});

// --- Movimiento local ---
function moveup() {
  if (numJugador === 1) {
    if (Player1.speedY > -3) Player1.speedY -= 1.5;
  } else {
    if (Player2.speedY > -3) Player2.speedY -= 1.5;
  }
}
function movedown() {
  if (numJugador === 1) {
    if (Player1.speedY < 3) Player1.speedY += 1.5;
  } else {
    if (Player2.speedY < 3) Player2.speedY += 1.5;
  }
}
function moveleft() {
  if (numJugador === 1) {
    if (Player1.speedX > -3) Player1.speedX -= 1.5;
  } else {
    if (Player2.speedX > -3) Player2.speedX -= 1.5;
  }
}
function moveright() {
  if (numJugador === 1) {
    if (Player1.speedX < 3) Player1.speedX += 1.5;
  } else {
    if (Player2.speedX < 3) Player2.speedX += 1.5;
  }
}

// --- Círculo ---
function createCircleLocal() {
  const radius = 15;
  const x = Math.random() * (myGameArea.canvas.width - 2 * radius) + radius;
  const y = Math.random() * (myGameArea.canvas.height - 2 * radius) + radius;
  circle = { x, y, radius, visible: true };
}

// Sólo J1 crea y sincroniza
function createCircleAndSync() {
  createCircleLocal();
  if (!idJoc) return;

  const body = new URLSearchParams();
  body.set('game_id', idJoc);
  body.set('circle_x', String(Math.round(circle.x)));
  body.set('circle_y', String(Math.round(circle.y)));

  fetch('game.php?action=actualizarCirculo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store'
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) console.warn(data.error);
    })
    .catch(console.error);
}

function enviarPuntoAlServidor() {
  if (!idJoc) return;

  const body = new URLSearchParams();
  body.set('game_id', idJoc);

  fetch('game.php?action=add_point', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store'
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        console.warn(data.error);
        return;
      }
      // Actualizar puntuaciones locales desde servidor
      if (data.p1_points != null) p1_points = Number(data.p1_points);
      if (data.p2_points != null) p2_points = Number(data.p2_points);

      document.getElementById("p1_score").innerText = p1_points;
      document.getElementById("p2_score").innerText = p2_points;
    })
    .catch(console.error);
}

function drawCircle() {
  if (!circle || !circle.visible) return;

  const ctx = myGameArea.context;

  // tamaño de la pelota (diámetro = 2 * radius)
  const size = circle.radius * 2;

  if (ballImage.complete) {
    // dibujamos la imagen centrada en (circle.x, circle.y)
    ctx.drawImage(
      ballImage,
      circle.x - size / 2,
      circle.y - size / 2,
      size,
      size
    );
  } else {
    // fallback mientras carga la imagen
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
  }
}


function checkCollision(player) {
  if (!circle.visible) return false;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  const dx = playerCenterX - circle.x;
  const dy = playerCenterY - circle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (circle.radius + Math.max(player.width, player.height) / 2);
}


function addNetStatsLabel() {
  const lbl = document.createElement('div');
  lbl.id = 'net_stats';
  lbl.style.position = 'absolute';
  lbl.style.bottom = '20px';
  lbl.style.left = '5%';
  lbl.style.transform = 'translateX(-50%)';
  lbl.style.padding = '4px 8px';
  lbl.style.background = 'rgba(255,255,255,0.8)';
  lbl.style.border = '1px solid #ddd';
  lbl.style.font = '12px Arial, sans-serif';
  lbl.style.borderRadius = '6px';
  lbl.textContent = 'RTT: — ms';
  document.body.appendChild(lbl);
}

function mostrarInfoJugador() {
  const info = document.createElement('div');
  info.id = 'player_info';
  info.style.position = 'absolute';
  info.style.top = '10px';
  info.style.left = '50%';
  info.style.transform = 'translateX(-50%)';
  info.style.padding = '6px 12px';
  info.style.background = 'rgba(0,0,0,0.75)';
  info.style.color = '#fff';
  info.style.borderRadius = '8px';
  info.style.font = '14px Arial, sans-serif';
  info.style.zIndex = '1000';

  const lado = (numJugador === 1) ? 'izquierda' : 'derecha';
  info.textContent = `Eres el Jugador ${numJugador}. Controlas al Megaman de la ${lado}.`;

  document.body.appendChild(info);

  // Quitar el mensaje después de 5 segundos
  setTimeout(() => {
    if (info.parentNode) info.parentNode.removeChild(info);
  }, 5000);
}



let lastRttMs = null;
let rttEma = null; // media exponencial para suavizar (opcional)

function startLatencyMonitor() {
  setInterval(() => {
    const t0 = performance.now();
    // cache-busting con ts y no-store
    fetch(`game.php?action=ping&ts=${Date.now()}`, { method: 'GET', cache: 'no-store' })
      .then(r => r.json())
      .then(() => {
        const rtt = Math.round(performance.now() - t0);
        lastRttMs = rtt;
        // EMA con alpha=0.3 para suavizar, opcional
        rttEma = (rttEma == null) ? rtt : Math.round(0.3 * rtt + 0.7 * rttEma);
        const label = document.getElementById('net_stats');
        if (label) label.textContent = `RTT: ${rtt} ms (avg: ${rttEma} ms)`;
      })
      .catch(() => {
        const label = document.getElementById('net_stats');
        if (label) label.textContent = `RTT: error`;
      });
  }, 1000);
}