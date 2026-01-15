# Huntress

**Role**: Ranged DPS / Mobile
**Sprite**: `character/sprites/huntress.png`
**Max Level**: 200
**Visual Scale**: 2.5
**Visual Offset**: 40, 0
**Sprite Cols**: 12
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 110
- **Mana**: 80 (Focus)
- **Speed**: 130 (Very Fast)
- **Def**: 6
- **Crit Rate**: 15%
- **Precision**: 30
- **Element**: Physical

## ⚔️ Skill List (20 Total)

| ID  | Name                | Type               | Unlock | Cost | Base Dmg | Description                                               |
| :-- | :------------------ | :----------------- | :----: | :--: | :------: | :-------------------------------------------------------- |
| 1   | **Throw Glaive**    | Range              |   1    |  0   |    9     | Bounces to 1 additional target.                           |
| 2   | **Evasion**         | Buff               |   1    |  15  |    -     | +30% Dodge Chance for 2 turns.                            |
| 3   | **Shadow Step**     | Mobility           |   5    |  20  |    -     | Teleport behind enemy and backstab.                       |
| 4   | **Poison Dart**     | DoT                |   8    |  10  |    4     | Applies poison for 3 turns.                               |
| 5   | **Multi-Glaive**    | AoE                |   12   |  25  |    12    | Hits 3 random enemies.                                    |
| 6   | **Entangling Trap** | CC                 |   18   |  30  |    0     | Roots target for 2 turns.                                 |
| 7   | **Swift Reflexes**  | Buff               |   25   |  20  |    0     | +20% Speed for 3 turns.                                   |
| 8   | **Piercing Shot**   | Heavy              |   35   |  40  |    45    | High damage, ignores 20% Def.                             |
| 9   | **Eagle Eye**       | Buff               |   45   |  35  |    0     | +40 Precision for 3 turns.                                |
| 10  | **Explosive Trap**  | AoE                |   60   |  50  |    25    | Deals fire damage to all nearby.                          |
| 11  | **Aimed Shot**      | Range              |   80   |  60  |    80    | Huge damage but high mana cost.                           |
| 12  | **Bleeding Edge**   | DoT                |  100   |  45  |    15    | Target bleeds every turn.                                 |
| 13  | **Rapid Toss**      | Multi-hit          |  125   |  55  |    30    | Hits target twice.                                        |
| 14  | **Camouflage**      | Utility            |  160   |  80  |    0     | Becomes invisible for 2 turns.                            |
| 15  | **Apex Predator**   | Massive Nuke       |  190   | 130  |   200    | Ultimate hunting technique.                               |
| 16  | **Tracker Stance**  | **Active Passive** |   10   |  0   |    -     | Reveal hidden enemies, +10 Precision. Toggle.             |
| 17  | **Stalker Stance**  | **Active Passive** |   10   |  0   |    -     | +20% Backstab damage. Toggle.                             |
| 18  | **Hunter Stance**   | **Active Passive** |   10   |  0   |    -     | Gain 5 Mana on hit. Toggle.                               |
| 19  | **Spirit Hunt**     | **Ultimate**       |   50   | 100  |    -     | Become invisible and deal triple damage on distinct hits. |
| 20  | **Alpha Strike**    | **Ultimate**       |   50   | 100  |    -     | Massive party-wide speed & dmg boost.                     |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
