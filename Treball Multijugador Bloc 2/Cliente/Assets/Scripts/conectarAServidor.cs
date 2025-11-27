using UnityEngine;
using TMPro;  // importante para TMP_InputField
using Unity.Networking.Transport.Samples;
using System;  // para ver ClientBehaviour

public class conectarAServidor : MonoBehaviour
{
    [SerializeField] private TMP_InputField ipTextField;
    [SerializeField] private TMP_InputField portTextField;
    [SerializeField] private ClientBehaviour clientBehaviour;

    // Método que llamará el botón "Aceptar"
    public void OnAceptarPulsado()
    {

        string ip = ipTextField.text.Trim();
        string portString = portTextField.text.Trim();

        if (string.IsNullOrEmpty(ip))
        {
            Debug.LogError("IP vacía");
            return;
        }

        if (!ushort.TryParse(portString, out ushort port))
        {
            Debug.LogError("Puerto inválido");
            return;
        }

        Debug.Log($"Datos introducidos: IP={ip}, Puerto={port}");
        clientBehaviour.ConnectToServer(ip, port);
    }
}
