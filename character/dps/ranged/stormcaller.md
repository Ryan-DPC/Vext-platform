# Stormcaller

**Role**: Ranged DPS / CC
**Sprite**: `character/sprites/stormcaller.png`
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 40, -55
**Sprite Cols**: 8
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 95
- **Mana**: 140
- **Speed**: 1.1
- **Def**: 5
- **Crit Rate**: 12%
- **Precision**: 15
- **Element**: Lightning

## ⚔️ Skill List (20 Total)

| ID  | Name                 | Type               | Unlock | Cost | Base Dmg | Description                                         |
| :-- | :------------------- | :----------------- | :----: | :--: | :------: | :-------------------------------------------------- |
| 1   | **Lightning Bolt**   | Range              |   1    |  5   |    10    | Chance to chain to nearby enemy.                    |
| 2   | **Static Field**     | CC                 |   1    |  15  |    2     | Enemies attacking you take damage + chance to Stun. |
| 3   | **Thunderclap**      | AoE                |   5    |  25  |    10    | Silence enemies in area.                            |
| 4   | **Volt Surge**       | Buff               |   8    |  20  |    0     | +20% Speed for 3 turns.                             |
| 5   | **Chain Lightning**  | AoE                |   12   |  40  |    20    | Jumps up to 4 times.                                |
| 6   | **Storm Shield**     | Defense            |   18   |  30  |    0     | Reflects 50% damage as electricity.                 |
| 7   | **Shock Pulse**      | Range              |   25   |  15  |    15    | Low mana, fast electric shot.                       |
| 8   | **Cyclone**          | CC                 |   35   |  50  |    10    | Traps target in a vortex for 1 turn.                |
| 9   | **Call of Storms**   | Buff               |   45   |  60  |    0     | Increases Crit Rate by 20% for 3 turns.             |
| 10  | **Ball Lightning**   | AoE                |   60   |  70  |    40    | Slow moving electric field.                         |
| 11  | **Conductivity**     | Debuff             |   80   |  40  |    0     | Target takes 30% more Lightning dmg.                |
| 12  | **Heaven's Fury**    | Massive Nuke       |  100   | 110  |   150    | Ultimate lightning strike from sky.                 |
| 13  | **Tesla Coil**       | Summon             |  125   |  90  |    -     | Place a ward that zaps enemies.                     |
| 14  | **Overload**         | Buff               |  160   | 120  |    0     | Skills trigger twice for 2 turns.                   |
| 15  | **The Big Bang**     | Massive AoE        |  190   | 180  |   350    | Destroys everything.                                |
| 16  | **Thunder Stance**   | **Active Passive** |   10   |  0   |    -     | +15% Crit rate. Toggle.                             |
| 17  | **Lightning Stance** | **Active Passive** |   10   |  0   |    -     | +25% Speed. Toggle.                                 |
| 18  | **Static Stance**    | **Active Passive** |   10   |  0   |    -     | Mana regen increased by 50%. Toggle.                |
| 19  | **Eye of the Storm** | **Ultimate**       |   50   | 120  |    -     | Immunity to CC and auto-lightning nearby foes.      |
| 20  | **Cataclysm**        | **Ultimate**       |   50   | 120  |    -     | Massive AoE storm for 5 turns.                      |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
