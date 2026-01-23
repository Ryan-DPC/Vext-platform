using UnityEngine;

public class SwordAttack : MonoBehaviour
{
    public float damage = 3f;
    public Collider2D swordAttack;

    void Start()
    {
        if (swordAttack == null) swordAttack = GetComponent<Collider2D>();
        // On s'assure que IsTrigger est coché
        swordAttack.isTrigger = true;
        swordAttack.enabled = false;
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (other.CompareTag("Enemy"))
        {
            Slime enemyScript = other.GetComponent<Slime>();
            if (enemyScript != null)
            {
                enemyScript.TakeDamage(damage);
            }
        }
    }
}