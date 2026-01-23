using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 1f;
    public float collisionOffset = 0.05f;
    public ContactFilter2D movementFilter;

    private Vector2 movementInput;
    private Rigidbody2D rb;
    private Animator animator;
    private List<RaycastHit2D> castCollisions = new List<RaycastHit2D>();

    // Contrôle si le joueur peut bouger (bloqué pendant l'attaque)
    bool canMove = true;

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
    }

    private void FixedUpdate()
    {
        if (canMove && movementInput != Vector2.zero)
        {
            // MISE À JOUR DES PARAMÈTRES DU BLEND TREE
            animator.SetFloat("Horizontal", movementInput.x);
            animator.SetFloat("Vertical", movementInput.y);

            // GESTION DU FLIP (localScale pour inclure la Hitbox)
            if (movementInput.x < 0)
            {
                transform.localScale = new Vector3(-1, 1, 1);
            }
            else if (movementInput.x > 0)
            {
                transform.localScale = new Vector3(1, 1, 1);
            }

            // LOGIQUE DE MOUVEMENT AVEC GLISSEMENT CONTRE LES MURS
            bool success = TryMove(movementInput);

            if (!success)
            {
                success = TryMove(new Vector2(movementInput.x, 0));

                if (!success)
                {
                    success = TryMove(new Vector2(0, movementInput.y));
                }
            }
            animator.SetBool("isMoving", success);
        }
        else
        {
            animator.SetBool("isMoving", false);
        }
    }

    private bool TryMove(Vector2 direction)
    {
        if (direction == Vector2.zero) return false;

        // On vérifie les collisions avant de se déplacer
        int count = rb.Cast(
            direction,
            movementFilter,
            castCollisions,
            moveSpeed * Time.fixedDeltaTime + collisionOffset);

        if (count == 0)
        {
            rb.MovePosition(rb.position + direction * moveSpeed * Time.fixedDeltaTime);
            return true;
        }
        return false;
    }

    // REÇOIT L'INPUT DE DÉPLACEMENT
    void OnMove(InputValue movementValue)
    {
        movementInput = movementValue.Get<Vector2>();
    }

    // DÉCLENCHE L'ATTAQUE
    void OnAttack()
    {
        animator.SetTrigger("swordAttack");
    }

    // ÉVÉNEMENTS D'ANIMATION (À placer dans tes clips d'attaque)
    public void LockMovement()
    {
        canMove = false;
    }

    public void UnlockMovement()
    {
        canMove = true;
    }
}