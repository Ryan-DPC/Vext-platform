# Guardian

**Role**: Tank / Melee
**Sprite**: `character/sprites/golem_blue.png`
**Alt Sprite**: `character/sprites/golem_orange.png` (Unlockable Skin)
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 40, -55
**Sprite Cols**: 8
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 300
- **Mana**: 100 (Energy)
- **Speed**: 0.8 (Very Slow)
- **Def**: 15
- **Crit Rate**: 2%
- **Precision**: 5
- **Element**: Earth

## ⚔️ Skill List (20 Total)

| ID  | Name                | Type               | Unlock | Cost | Base Dmg | Description                             |
| :-- | :------------------ | :----------------- | :----: | :--: | :------: | :-------------------------------------- |
| 1   | **Smash**           | Melee              |   1    |  0   |    30    | Heavy melee hit.                        |
| 2   | **Harden**          | Defense            |   1    |  0   |    0     | +5 Def for 1 turn.                      |
| 3   | **Earthquake**      | AoE                |   10   |  30  |    20    | Dmg and Slow to all enemies.            |
| 4   | **Stone Wall**      | Defense            |   15   |  20  |    0     | Absorb 50 incoming damage.              |
| 5   | **Pulverize**       | Melee              |   20   |  25  |    25    | High impact hit, reduces enemy dodge.   |
| 6   | **Echoing Stomp**   | CC                 |   28   |  35  |    10    | Interupts enemy casting in area.        |
| 7   | **Granite Skin**    | Buff               |   35   |  40  |    0     | +20 Def for 3 turns.                    |
| 8   | **Seismic Toss**    | Melee              |   45   |  50  |    40    | Throws enemy, stunning them.            |
| 9   | **Mountain Heart**  | Self-Heal          |   60   |  60  |    0     | Heals 25% Max HP.                       |
| 10  | **Dust Cloud**      | Debuff             |   80   |  45  |    0     | Reduces enemy precision significantly.  |
| 11  | **Root Spike**      | CC                 |  100   |  55  |    30    | Traps enemy in stone roots.             |
| 12  | **Avalanche**       | Massive AoE        |  125   |  80  |    80    | Huge earth damage to all.               |
| 13  | **Unmovable**       | Buff               |  160   |  70  |    0     | Immune to knockback and stun (3 turns). |
| 14  | **Earth Fury**      | Ultimate Prime     |  180   | 100  |   150    | Deals damage based on current Def.      |
| 15  | **World Pillar**    | Massive Nuke       |  200   | 150  |   400    | The ultimate earth smash.               |
| 16  | **Stone Stance**    | **Active Passive** |   10   |  0   |    -     | +30% Defense, -20% Speed. Toggle.       |
| 17  | **Obsidian Stance** | **Active Passive** |   10   |  0   |    -     | Refelcts 20% Melee Dmg. Toggle.         |
| 18  | **Gaia Stance**     | **Active Passive** |   10   |  0   |    -     | Heals 5 HP every turn. Toggle.          |
| 19  | **Fortress Mode**   | **Ultimate**       |   50   |  0   |    -     | Cannot move, but reflect 50% dmg taken. |
| 20  | **Terraforming**    | **Ultimate**       |   50   | 100  |    -     | Changes terrain, boosting all stats.    |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
