using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

public class MyHoverGlow : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler
{
    private Outline outline;

    void Start()
    {
        outline = GetComponent<Outline>();
        outline.enabled = false;   // apagado al inicio
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        Debug.Log("hover on");
        outline.enabled = true;    // encender halo
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        Debug.Log("hover off");
        outline.enabled = false;   // apagar halo
    }
}
