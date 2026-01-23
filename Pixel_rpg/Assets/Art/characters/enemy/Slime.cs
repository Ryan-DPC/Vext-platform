using UnityEngine;

public class Slime : MonoBehaviour
{
    [Header("Stats")]
    public float health = 3f;
    public float moveSpeed = 1.5f;
    public float changeDirectionInterval = 2f;

    private Rigidbody2D rb;
    private Animator animator;
    private Vector2 movementDirection;
    private float timer;

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        ChooseNewDirection();
    }

    void Update()
    {
        timer += Time.deltaTime;
        if (timer >= changeDirectionInterval)
        {
            ChooseNewDirection();
            timer = 0;
        }

        // ENVOI DES DONNÉES À L'ANIMATOR
        if (animator != null)
        {
            // On utilise Horizontal et Vertical pour le Blend Tree
            animator.SetFloat("Horizontal", movementDirection.x);
            animator.SetFloat("Vertical", movementDirection.y);

            // On utilise isMoving pour passer de Idle à Walk
            animator.SetBool("isMoving", movementDirection != Vector2.zero);
        }
    }

    void FixedUpdate()
    {
        // Déplacement physique fluide
        rb.MovePosition(rb.position + movementDirection * moveSpeed * Time.fixedDeltaTime);
    }

    private void ChooseNewDirection()
    {
        // FIX : On précise UnityEngine.Random pour supprimer l'erreur rouge
        int pick = UnityEngine.Random.Range(0, 5);

        switch (pick)
        {
            case 0: movementDirection = Vector2.up; break;    // Vers le Haut (Y = 1)
            case 1: movementDirection = Vector2.down; break;  // Vers le Bas (Y = -1)
            case 2: movementDirection = Vector2.left; break;  // Vers la Gauche (X = -1)
            case 3: movementDirection = Vector2.right; break; // Vers la Droite (X = 1)
            default: movementDirection = Vector2.zero; break; // Arrêt (0, 0)
        }
    }

    public void TakeDamage(float damage)
    {
        health -= damage;
        // Déclenche l'animation de dégâts
        if (animator != null) animator.SetTrigger("hurt");

        if (health <= 0) Defeat();
    }

    private void Defeat()
    {
        // Déclenche l'animation de mort
        if (animator != null) animator.SetTrigger("death");
        Destroy(gameObject, 0.5f);
    }
}