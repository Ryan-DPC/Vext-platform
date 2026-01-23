using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 1f;

    // Correction ici : collisionOffset est un chiffre (float)
    public float collisionOffset = 0.05f;

    // Correction ici : il manquait le filtre pour les collisions
    public ContactFilter2D movementFilter;

    private Vector2 movementInput;
    private Rigidbody2D rb;
    List<RaycastHit2D> castCollisions = new List<RaycastHit2D>();

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    private void FixedUpdate()
    {
        if (movementInput != Vector2.zero)
        {
            // 1. Essayer de bouger normalement (X et Y)
            int count = rb.Cast(movementInput, movementFilter, castCollisions, moveSpeed * Time.fixedDeltaTime + collisionOffset);

            if (count == 0)
            {
                rb.MovePosition(rb.position + movementInput * moveSpeed * Time.fixedDeltaTime);
            }
            else
            {
                // 2. Si bloqué, essayer de bouger UNIQUEMENT en X
                Vector2 moveX = new Vector2(movementInput.x, 0);
                count = rb.Cast(moveX, movementFilter, castCollisions, moveSpeed * Time.fixedDeltaTime + collisionOffset);
                if (count == 0 && movementInput.x != 0)
                {
                    rb.MovePosition(rb.position + moveX * moveSpeed * Time.fixedDeltaTime);
                }

                // 3. Sinon, essayer de bouger UNIQUEMENT en Y
                Vector2 moveY = new Vector2(0, movementInput.y);
                count = rb.Cast(moveY, movementFilter, castCollisions, moveSpeed * Time.fixedDeltaTime + collisionOffset);
                if (count == 0 && movementInput.y != 0)
                {
                    rb.MovePosition(rb.position + moveY * moveSpeed * Time.fixedDeltaTime);
                }
            }
        }
    }

    void OnMove(InputValue movementValue)
    {
        movementInput = movementValue.Get<Vector2>();
    }
}