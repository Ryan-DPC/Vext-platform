using System.Diagnostics;
using UnityEngine;

public class SwordAttack : MonoBehaviour
{
    // Référence au collider de la hitbox (le rectangle vert)
    public Collider2D swordCollider;
    public float damage = 3f;

    private void Start()
    {
        // Si tu n'as pas glissé le collider dans l'inspecteur, on le cherche
        if (swordCollider == null)
        {
            swordCollider = GetComponent<Collider2D>();
        }

        // On s'assure qu'elle est éteinte au début du jeu
        StopAttack();
    }

    // Version simplifiée : une seule fonction pour activer l'attaque
    // Car ton PlayerController s'occupe déjà de tourner l'objet
    public void StartAttack()
    {
        swordCollider.enabled = true;
    }

    public void StopAttack()
    {
        swordCollider.enabled = false;
    }

    // C'est ici qu'on détecte si on touche un ennemi
    private void OnTriggerEnter2D(Collider2D other)
    {
    }
}