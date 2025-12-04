using TMPro;
using Unity.Networking.Transport;
using Unity.Networking.Transport.Samples;
using Unity.Networking.Transport.Utilities;
using UnityEngine;
using UnityEngine.UI;

public class CharacterManager : MonoBehaviour
{

    private void Start()
    {
        GameObject canvas = GameObject.Find("Canvas");
        float posicionXPerro = ClientBehaviour.Instance.posXPerro;
        float posicionYPerro = ClientBehaviour.Instance.posYPerro;
        float posicionXCreeper = ClientBehaviour.Instance.posXCreeper;
        float posicionYCreeper = ClientBehaviour.Instance.posYCreeper;

        Transform perroTransform = canvas.transform.Find("perroPersonaje");
        Transform creeperTransform = canvas.transform.Find("creeperPersonaje");
        //Debug.Log(posicionX);
        //Debug.Log(posicionY);
        perroTransform.gameObject.SetActive(true);
        perroTransform.transform.position = new Vector3(posicionXPerro, posicionYPerro, 0);
        creeperTransform.gameObject.SetActive(true);
        creeperTransform.transform.position = new Vector3(posicionXCreeper, posicionYCreeper, 0);

        if (ClientBehaviour.Instance.perro == true) {

            Debug.Log("Perro visto");


            if (perroTransform != null)
            {
            }
        }
        if (ClientBehaviour.Instance.creeper == true)
        {
            if (creeperTransform != null)
            {

            }
        }
    }
    private void Update()
    {
        
    }
}
