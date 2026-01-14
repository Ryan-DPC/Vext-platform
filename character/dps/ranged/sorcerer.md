# Sorcerer

**Role**: Ranged DPS / Utility
**Sprite**: `character/sprites/sorcerer.png`
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 40, -55
**Sprite Cols**: 8
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 100
- **Mana**: 160
- **Speed**: 1.0
- **Def**: 5
- **Crit Rate**: 5%
- **Precision**: 15
- **Element**: Magic

## ⚔️ Skill List (20 Total)

| ID  | Name                 | Type               | Unlock | Cost | Base Dmg | Description                                   |
| :-- | :------------------- | :----------------- | :----: | :--: | :------: | :-------------------------------------------- |
| 1   | **Arcane Orb**       | Range              |   1    |  8   |    12    | Slow moving orb, high damage.                 |
| 2   | **Dispel**           | Utility            |   1    |  20  |    -     | Removes buffs from enemy / debuffs from ally. |
| 3   | **Telekinesis**      | CC                 |   5    |  15  |    5     | Push enemy back.                              |
| 4   | **Magic Missile**    | Multi-hit          |   8    |  12  |    15    | Fires 5 small bolts.                          |
| 5   | **Arcane Ward**      | Defense            |   12   |  30  |    0     | Shield that lasts 3 turns.                    |
| 6   | **Slow**             | Debuff             |   18   |  25  |    0     | Reduces enemy speed by 50%.                   |
| 7   | **Arcane Blast**     | Range              |   25   |  40  |    35    | High impact arcane hit.                       |
| 8   | **Mirror Image**     | Summon             |   35   |  60  |    -     | Create 2 illusions of yourself.               |
| 9   | **Time Warp**        | Buff               |   45   |  70  |    0     | Party gains +30% Speed for 2 turns.           |
| 10  | **Gravity Well**     | AoE CC             |   60   |  80  |    15    | Roots all enemies in area.                    |
| 11  | **Spell Steal**      | Utility            |   80   |  50  |    -     | Steal a buff from the enemy.                  |
| 12  | **Temporal Echo**    | Range              |  100   |  90  |    60    | Hits target again after 1 turn.               |
| 13  | **Cosmic Ray**       | Heavy              |  125   | 110  |   150    | Devastating beam of magic.                    |
| 14  | **Arcane Intellect** | Buff               |  160   |  40  |    0     | +30% Spell damage for party.                  |
| 15  | **Reality Rip**      | Massive Nuke       |  190   | 180  |   300    | Shatters reality at target location.          |
| 16  | **Wisdom Stance**    | **Active Passive** |   10   |  0   |    -     | +50% Mana regen. Toggle.                      |
| 17  | **Force Stance**     | **Active Passive** |   10   |  0   |    -     | +20% Knockback distance. Toggle.              |
| 18  | **Barrier Stance**   | **Active Passive** |   10   |  0   |    -     | Automatically gain small shield every turn.   |
| 19  | **Black Hole**       | **Ultimate**       |   50   | 150  |    50    | Pulls all enemies to center and deals DoT.    |
| 20  | **Time Stop**        | **Ultimate**       |   50   | 150  |    -     | Stop time for 1 full turn (Allies act).       |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
