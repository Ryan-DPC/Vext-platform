using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float walkSpeed = 4f;
    [SerializeField] private float sprintSpeed = 8f;
    [SerializeField] private float acceleration = 10f; // Vitesse de transition
    [SerializeField] private float idleFriction = 0.2f; // Plus bas = arrêt plus rapide

    private Vector2 movementInput;
    private Vector2 currentVelocity;
    private float currentMaxSpeed;

    private Rigidbody2D rb;
    private Animator animator;
    private List<RaycastHit2D> castCollisions = new List<RaycastHit2D>();

    bool canMove = true;

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        currentMaxSpeed = walkSpeed;
    }

    private void FixedUpdate()
    {
        if (!canMove) return;

        // 1. GESTION DU SPRINT (ACCÉLÉRATION PROGRESSIVE)
        bool isSprinting = Keyboard.current.shiftKey.isPressed;
        float targetMaxSpeed = isSprinting ? sprintSpeed : walkSpeed;

        // On transitionne vers la vitesse cible (walk ou sprint) progressivement
        currentMaxSpeed = Mathf.MoveTowards(currentMaxSpeed, targetMaxSpeed, acceleration * Time.fixedDeltaTime);

        if (movementInput != Vector2.zero)
        {
            // On accélère vers la direction
            currentVelocity = Vector2.MoveTowards(currentVelocity, movementInput * currentMaxSpeed, acceleration);

            animator.SetFloat("Horizontal", movementInput.x);
            animator.SetFloat("Vertical", movementInput.y);

            if (movementInput.x < 0) transform.localScale = new Vector3(-1, 1, 1);
            else if (movementInput.x > 0) transform.localScale = new Vector3(1, 1, 1);

            TryMove(currentVelocity);
        }
        else
        {
            // 2. ARRÊT NET : Friction plus forte quand on ne touche à rien
            currentVelocity = Vector2.Lerp(currentVelocity, Vector2.zero, 1 - idleFriction);
        }

        // 3. MISE À JOUR ANIMATOR (L'astuce pour les jambes)
        // On utilise movementInput pour savoir si on DOIT marcher
        bool isMoving = movementInput != Vector2.zero;
        animator.SetBool("isMoving", isMoving);

        // On envoie la vitesse réelle pour le Blend entre Walk et Run
        animator.SetFloat("Speed", currentVelocity.magnitude);
    }

    private bool TryMove(Vector2 direction)
    {
        if (direction == Vector2.zero) return false;
        rb.MovePosition(rb.position + direction * Time.fixedDeltaTime);
        return true;
    }

    void OnMove(InputValue value) => movementInput = value.Get<Vector2>();
    void OnAttack() => animator.SetTrigger("swordAttack");
    public void LockMovement() => canMove = false;
    public void UnlockMovement() => canMove = true;
}