# Pyromancer

**Role**: Ranged DPS / AoE
**Sprite**: `character/sprites/pyromancer.png`
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 40, -55
**Sprite Cols**: 8
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 90
- **Mana**: 150
- **Speed**: 100
- **Def**: 4
- **Crit Rate**: 10%
- **Precision**: 10
- **Element**: Fire

## ⚔️ Skill List (20 Total)

| ID  | Name                  | Type               | Unlock | Cost | Base Dmg | Description                                 |
| :-- | :-------------------- | :----------------- | :----: | :--: | :------: | :------------------------------------------ |
| 1   | **Scorch**            | Range              |   1    |  5   |    12    | High Fire damage.                           |
| 2   | **Fire Wall**         | DoT Area           |   1    |  20  |    5     | Wall burns anyone passing through.          |
| 3   | **Combustion**        | AoE                |   5    |  30  |    15    | Explodes Burn effects for extra damage.     |
| 4   | **Flame Breath**      | AoE                |   8    |  15  |    10    | Deals damage in a cone.                     |
| 5   | **Phoenix Flame**     | Self-Rez           |   12   | 100  |    0     | Revive once per combat at 20% HP.           |
| 6   | **Lava Burst**        | Range              |   18   |  35  |    30    | Destroys target's defense.                  |
| 7   | **Heat Wave**         | AoE CC             |   25   |  45  |    10    | Pushes back and slows enemies.              |
| 8   | **Dragon's Roar**     | Buff               |   35   |  50  |    0     | +40% Fire Dmg for 3 turns.                  |
| 9   | **Meteor Strike**     | Heavy AoE          |   45   |  70  |    60    | Delayed massive damage in area.             |
| 10  | **Living Bomb**       | Debuff             |   60   |  60  |    20    | Target explodes after 2 turns.              |
| 11  | **Ignite Soul**       | Mana Burn          |   80   |  40  |    15    | Consumes enemy Mana to deal dmg.            |
| 12  | **Sunray**            | Line               |  100   |  90  |   120    | Beam that hits all targets in a line.       |
| 13  | **Volcanic Eruption** | AoE DoT            |  125   | 110  |    40    | Constant fire damage floor created.         |
| 14  | **Core Overload**     | Buff               |  160   | 150  |    0     | Massive boost, but reduces HP to 1 after.   |
| 15  | **Supernova**         | Massive Nuke       |  190   | 200  |   400    | Ultimate fire explosion.                    |
| 16  | **Magma Stance**      | **Active Passive** |   10   |  0   |    -     | +30% Burn length. Toggle.                   |
| 17  | **Cinder Stance**     | **Active Passive** |   10   |  0   |    -     | +20% Speed, -10% Mana costs. Toggle.        |
| 18  | **Ash Stance**        | **Active Passive** |   10   |  0   |    -     | Enemies attacking you are burned. Toggle.   |
| 19  | **Inferno**           | **Ultimate**       |   50   | 150  |   100    | Massive AoE Fire damage centered on caster. |
| 20  | **Chaos Fire**        | **Ultimate**       |   50   | 150  |    -     | Randomly blast 10 fireballs.                |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
