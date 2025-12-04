using System.Collections.Generic;
using UnityEngine;
using Unity.Networking.Transport.Samples; // Necesario para la struct CharacterSpawnData

public class GameManager : MonoBehaviour
{
    // 1. Singleton: Acceso estático a la única instancia
    public static GameManager Instance;

    // --- NUEVA ESTRUCTURA DE DATOS PÚBLICA (para compartir entre scripts) ---
    public struct CharacterSpawnData
    {
        public string CharacterName;
        public Vector3 Position;
    }

    [System.Serializable]
    public struct CharacterPrefabMapping
    {
        public string characterName;
        public GameObject prefab;
    }



    // Asigna los prefabs de los personajes aquí en el Inspector
    public List<CharacterPrefabMapping> characterPrefabs;

    // Referencia al prefab del script de control local del jugador (p. ej., un componente de movimiento)
    public GameObject LocalPlayerControlPrefab;

    // Fragmento de GameManager.cs (Método SpawnCharacters)

    public void SpawnCharacters(List<CharacterSpawnData> spawnData, string localPlayerName)
    {
        Debug.Log($"Iniciando spawning de {spawnData.Count} personajes. Local player: {localPlayerName}");

        foreach (var data in spawnData)
        {
            // 1. Encontrar el Prefab correcto
            GameObject charPrefab = characterPrefabs.Find(p => p.characterName == data.CharacterName).prefab;

            if (charPrefab == null)
            {
                Debug.LogError($"Prefab no encontrado para el personaje: {data.CharacterName}. Revise la lista 'characterPrefabs' en el Inspector.");
                continue;
            }

            // 2. Instanciar el personaje
            GameObject newChar = Instantiate(charPrefab, data.Position, Quaternion.identity);

            // 3. Lógica de Control: Añadir controles al jugador local
            if (data.CharacterName == localPlayerName && LocalPlayerControlPrefab != null)
            {
                // Este es MI personaje.
                Debug.Log($"SPAWN -> JUGADOR LOCAL: {localPlayerName}");
                // Instanciar el prefab que contiene el script de movimiento/input del jugador
                // newChar.AddComponent<LocalMovementController>(); // Si es un componente
                Instantiate(LocalPlayerControlPrefab, newChar.transform); // Si es un objeto hijo
            }
            else
            {
                // Este es el personaje de otro cliente o del servidor (sólo representación).
                Debug.Log($"SPAWN -> JUGADOR REMOTO: {data.CharacterName}");
                // Si tiene componentes de Input/Movimiento, ¡DEBEN DESACTIVARSE aquí!
                // Example: Destroy(newChar.GetComponent<LocalMovementController>()); 
            }
        }
    }



}