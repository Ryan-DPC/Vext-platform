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
            // Mise à jour des directions pour les Blend Trees
            animator.SetFloat("Horizontal", movementInput.x);
            animator.SetFloat("Vertical", movementInput.y);

            // Flip global pour que la hitbox suive le regard
            if (movementInput.x < 0) transform.localScale = new Vector3(-1, 1, 1);
            else if (movementInput.x > 0) transform.localScale = new Vector3(1, 1, 1);

            // Logique de collision "glissante"
            bool success = TryMove(movementInput);
            if (!success)
            {
                success = TryMove(new Vector2(movementInput.x, 0));
                if (!success) TryMove(new Vector2(0, movementInput.y));
            }
            animator.SetBool("isMoving", true);
        }
        else
        {
            animator.SetBool("isMoving", false);
        }
    }

    private bool TryMove(Vector2 direction)
    {
        int count = rb.Cast(direction, movementFilter, castCollisions, moveSpeed * Time.fixedDeltaTime + collisionOffset);
        if (count == 0)
        {
            rb.MovePosition(rb.position + direction * moveSpeed * Time.fixedDeltaTime);
            return true;
        }
        return false;
    }

    void OnMove(InputValue movementValue) => movementInput = movementValue.Get<Vector2>();

    void OnAttack() => animator.SetTrigger("swordAttack"); // Déclenche le trigger

    // Fonctions pour Animation Events
    public void LockMovement() => canMove = false;
    public void UnlockMovement() => canMove = true;
}