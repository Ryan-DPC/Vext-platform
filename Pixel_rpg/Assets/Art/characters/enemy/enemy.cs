using UnityEngine;

public class Enemy : MonoBehaviour
{
    public float health = 1f;

    public void TakeDamage(float damage)
    {
        health -= damage;
        // Correction de l'erreur ambiguë en précisant UnityEngine
        UnityEngine.Debug.Log("Ennemi touché ! Vie restante : " + health);

        if (health <= 0)
        {
            UnityEngine.Debug.Log("Ennemi vaincu !");
            Destroy(gameObject);
        }
    }
}