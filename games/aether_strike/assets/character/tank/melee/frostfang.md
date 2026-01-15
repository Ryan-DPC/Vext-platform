# Frostfang

**Role**: Tank / CC / Melee
**Sprite**: `character/sprites/frostfang.png`
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 40, -55
**Sprite Cols**: 8
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 170
- **Mana**: 50
- **Speed**: 75
- **Def**: 12 (Thick Fur)
- **Crit Rate**: 5%
- **Precision**: 10
- **Element**: Ice

## ⚔️ Skill List (20 Total)

| ID  | Name                  | Type               | Unlock | Cost | Base Dmg | Description                            |
| :-- | :-------------------- | :----------------- | :----: | :--: | :------: | :------------------------------------- |
| 1   | **Icy Bite**          | Melee              |   1    |  5   |    10    | Slows target.                          |
| 2   | **Winter Howl**       | CC                 |   1    |  20  |    -     | Freeze enemies in melee range.         |
| 3   | **Snow Barrier**      | Defense            |   5    |  15  |    0     | Gain temporary HP shield (30).         |
| 4   | **Frost Breath**      | AoE CC             |   8    |  25  |    8     | Slows all enemies in area.             |
| 5   | **Frozen Claw**       | Melee              |   12   |  10  |    15    | Freezes target on crit.                |
| 6   | **Blizzard Hide**     | Buff               |   18   |  30  |    0     | +15 Defense for 3 turns.               |
| 7   | **Ice Spear**         | Range              |   25   |  20  |    25    | Projectile made of ice.                |
| 8   | **Shiver**            | Debuff             |   35   |  15  |    5     | Reduces enemy speed by 40%.            |
| 9   | **Arctic Pulse**      | AoE                |   45   |  40  |    20    | Waves of cold pulse from you.          |
| 10  | **Glacier Crush**     | Heavy              |   60   |  50  |    70    | Huge hit, massive slow.                |
| 11  | **Hibernation**       | Self-Heal          |   80   |  60  |    0     | Heals 40% HP, skip next turn.          |
| 12  | **Permafrost**        | CC                 |  100   |  70  |    0     | Stuns target for 2 turns.              |
| 13  | **Ice Wall**          | Defense            |  125   |  45  |    0     | Blocks next 2 incoming attacks.        |
| 14  | **Frostfire**         | Mixed              |  160   |  80  |   100    | Burns and Slows target.                |
| 15  | **Absolute Zero**     | Massive AoE        |  190   | 150  |   250    | Freezes all enemies for 1 turn.        |
| 16  | **Tundra Stance**     | **Active Passive** |   10   |  0   |    -     | +20% HP, +5 Defense. Toggle.           |
| 17  | **Iceberg Stance**    | **Active Passive** |   10   |  0   |    -     | Reflects 15% damage as Ice. Toggle.    |
| 18  | **Glacial Stance**    | **Active Passive** |   10   |  0   |    -     | Immune to Slow and Freeze. Toggle.     |
| 19  | **Avalanche**         | **Ultimate**       |   50   | 100  |    60    | AoE Dmg and Stun.                      |
| 20  | **Rage of the North** | **Ultimate**       |   50   | 100  |    -     | Double Speed and Immunity for 3 turns. |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
