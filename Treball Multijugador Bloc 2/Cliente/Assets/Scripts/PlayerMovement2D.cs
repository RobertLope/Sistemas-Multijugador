using TMPro;
using Unity.Networking.Transport;
using Unity.Networking.Transport.Samples;
using Unity.Networking.Transport.Utilities;
using UnityEngine;
using UnityEngine.UI;

public class PlayerMovement2D : MonoBehaviour
{
    public float speed = 100f;      // Velocidad horizontal
    public float jumpForce = 100f;  // Fuerza del salto
    Rigidbody2D rb;
    bool isGrounded = false;      // Para saber si est� tocando el suelo

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>(); // Obtenemos el Rigidbody2D del personaje
    }

    private void Start()
    {
        string nombreObjeto = gameObject.name;
        if (ClientBehaviour.Instance.perro && nombreObjeto != "perroPersonaje") {
            enabled = false;
            return;

        }

        if (ClientBehaviour.Instance.creeper && nombreObjeto != "creeperPersonaje")
        {
            enabled = false;
            return;

        }
    }

    void Update()
    {
        // Leer input horizontal (A/D, flechas izquierda/derecha)
        float inputX = Input.GetAxisRaw("Horizontal");

        // Mover al personaje usando la velocidad del rigidbody
        rb.linearVelocity = new Vector2(inputX * speed, rb.linearVelocity.y);

        // Saltar: solo si est� en el suelo
        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            // Ponemos la velocidad vertical directamente para un salto "seco"
            rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
        }
    }

    // Detectar cu�ndo toca el suelo
    private void OnCollisionEnter2D(Collision2D collision)
    {
        // Si chocamos con un objeto con tag "Ground", consideramos que estamos en el suelo
        if (collision.collider.CompareTag("Ground"))
        {
            isGrounded = true;
        }
    }

    private void OnCollisionExit2D(Collision2D collision)
    {
        if (collision.collider.CompareTag("Ground"))
        {
            isGrounded = false;
        }
    }
}
