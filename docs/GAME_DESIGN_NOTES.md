# Aether Strike - Game Design Notes

## 💰 Système Économique & Vagues

### Gold (Or)

- **Individuel** : Chaque joueur possède sa propre bourse d'or. L'or n'est PAS partagé.
- **Récompense de Vague** : L'or est distribué à la fin de chaque vague (Wave).

### Mort & Pénalités

- **Condition de survie** : Il faut être **VIVANT** à la fin de la vague pour recevoir l'or de celle-ci.
- **Mort en combat** :
  - Si un joueur meurt à la Wave X (ex: Wave 3), il **ne reçoit pas** les golds de la Wave 3.
  - Il **conserve** les golds acquis lors des vagues précédentes (Wave 1, 2).
  - **Pénalité de mort** : Perte potentielle de golds ou pénalité de score (à préciser).

### Fuite (Flee)

- **Mécanique** : Permet de quitter le combat volontairement.
- **Avantage** : Sécurise les golds acquis **SANS pénalité** (contrairement à la mort).
- Utilisation stratégique si la vague semble perdue pour éviter la pénalité de mort.

## 🏠 Progression Hors-Combat (Menu Principal)

### Boutique (Shop)

- Accessible via un bouton "BOUTIQUE" dans le menu principal (après avoir quitté la game).
- Permet d'acheter/débloquer de nouvelles **Classes**.

### Arbre de Compétences (Skill Tree)

- Accessible via un bouton dédié (Future feature).
- Permet d'améliorer les statistiques ou capacités.

## ⚔️ Interface de Combat (HUD)

### Validé

- **Timeline** : Barre en haut de l'écran affichant l'ordre des tours. Essentielle pour la stratégie (vitesse).
- **Team Panel** : Pas de barres verticales colorées. Affichage épuré.
- **Incrustation** : Wave et Gold intégrés dans le panneau ennemi.

## 🛡️ Mécaniques de Combat

### Système d'Aggro (Menace)

- **Objectif** : Donner un rôle défensif au Tank (Warrior) et protéger les classes fragiles.
- **Fonctionnement** :
  - Chaque action des joueurs génère de la "Menace" (Aggro) envers les ennemis.
  - Les ennemis attaquent le joueur ayant le plus d'Aggro.
  - Le **Tank** dispose de compétences générant beaucoup d'Aggro (Taunt/Provocation).
  - Les DPS/Healers génèrent moins d'Aggro, mais doivent faire attention à ne pas dépasser le Tank.

### Buffs & Debuffs (Altérations d'état)

- Ajoute de la profondeur tactique au-delà des simples dégâts.
- **Debuffs** : Poison, Etourdissement (Stun), Brûlure, Ralentissement.
- **Buffs** : Bouclier, Rage (ATK up), Hâte (Vitesse up).
- **Synergies** : Combinaison d'effets entre classes (ex: Eau + Foudre = Dégâts accrus + Stun).

### Intelligence Artificielle (IA)

- **Gestion Aggro** : Chaque ennemi gère sa propre table de menace de manière indépendante.
- **Comportement Avancé** :
  - **PV Bas (<30%)** : L'ennemi doit évaluer la situation :
    - _Kill Potential_ : Si l'ennemi peut achever un joueur, il attaque au lieu de se soigner.
    - _Support_ : Si l'ennemi va mourir, il peut choisir de buffer un allié puissant plutôt que de se soigner inutilement.
    - _Éviter la boucle de soin_ : Ne pas spammer le soin si les dégâts reçus sont supérieurs au soin.
  - **Esprit d'équipe** : Les ennemis peuvent protéger celui qui est ciblé par les joueurs (Taunt, Bouclier).
