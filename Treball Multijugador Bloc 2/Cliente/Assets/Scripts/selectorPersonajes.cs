// selectorPersonajes.cs

using UnityEngine;
using System.Collections.Generic;
using TMPro;
using Unity.Networking.Transport;
using Unity.Networking.Transport.Samples;
using Unity.Networking.Transport.Utilities;
using UnityEngine.UI;

public class selectorPersonajes : MonoBehaviour
{
    // *** ASIGNAR EN EL INSPECTOR DE UNITY ***
    // 1. El Prefab del botón que tiene el script CharacterSelectButton.cs
    //public GameObject CharacterButtonPrefab;
    // 2. El Transform (padre) donde se crearán los botones (p. ej., un Grid)
    //public Transform ButtonParentContainer;



    void Start()
    {
        // Llamar al cliente para que envíe un paquete de Handshake
        if (ClientBehaviour.Instance != null)
        {
            ClientBehaviour.Instance.SendHandshakeReady();
        }
    }

    
    /*
    // Este método es llamado por ClientBehaviour cuando recibe la lista ('D')
    public void SetupButtons(List<string> characters)
    {
        if (ButtonParentContainer == null || CharacterButtonPrefab == null)
        {
            Debug.LogError("SetupButtons no se puede ejecutar: ButtonParentContainer o CharacterButtonPrefab no están asignados en el Inspector de 'selectorPersonajes'.");
            return;
        }

        // Limpia los botones anteriores (si los hubiera)
        foreach (Transform child in ButtonParentContainer)
        {
            Destroy(child.gameObject);
        }

        // Crea un botón por cada personaje disponible
        foreach (string charName in characters)
        {
            // Instancia el nuevo botón
            GameObject newButtonObj = Instantiate(CharacterButtonPrefab, ButtonParentContainer);

            // 1. Configura el texto (asume que el texto es un componente hijo)
            TextMeshProUGUI buttonText = newButtonObj.GetComponentInChildren<TextMeshProUGUI>();
            if (buttonText != null)
            {
                buttonText.text = charName;
            }

            // 2. Configura el script de lógica del botón
            CharacterSelectButton buttonLogic = newButtonObj.GetComponent<CharacterSelectButton>();
            if (buttonLogic != null)
            {
                buttonLogic.characterName = charName;
            }
        }
    }
    */


}