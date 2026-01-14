# Juggernaut

**Role**: Tank / CC / Melee
**Sprite**: `character/sprites/bot.png`
**Max Level**: 200
**Visual Scale**: 1.5
**Visual Offset**: 40, 0
**Sprite Cols**: 1
**Sprite Rows**: 5
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 180
- **Mana**: 50 (Fuel)
- **Speed**: 0.8
- **Def**: 14
- **Crit Rate**: 5%
- **Precision**: 5
- **Element**: Physical

## ⚔️ Skill List (20 Total)

| ID  | Name                  | Type               | Unlock | Cost | Base Dmg | Description                                   |
| :-- | :-------------------- | :----------------- | :----: | :--: | :------: | :-------------------------------------------- |
| 1   | **Ball Smash**        | Melee              |   1    |  0   |    15    | Heavy hit with ball and chain.                |
| 2   | **Chain Hook**        | Pull               |   1    |  15  |    8     | Pulls an enemy to the front line.             |
| 3   | **Spin Cycle**        | AoE                |   5    |  30  |    12    | Spin attack hitting all adjacent.             |
| 4   | **Bulk Up**           | Buff               |   8    |  20  |    0     | +10 Def for 3 turns.                          |
| 5   | **Heavy Slam**        | CC                 |   12   |  25  |    15    | Stuns target for 1 turn.                      |
| 6   | **Oil Spray**         | Debuff             |   18   |  20  |    5     | Reduces enemy speed by 30%.                   |
| 7   | **Wrecking Ball**     | Burst              |   25   |  45  |    35    | Hits target multiple times.                   |
| 8   | **Magnetic Pull**     | CC                 |   35   |  40  |    10    | Pulls all enemies closer.                     |
| 9   | **Repair Protocol**   | Self-Heal          |   45   |  50  |    0     | Restores 30 HP.                               |
| 10  | **Overcharge Blast**  | Range              |   60   |  55  |    40    | Fires a laser beam.                           |
| 11  | **Iron Fortress**     | Defense            |   80   |  70  |    0     | Absorb 100 incoming dmg.                      |
| 12  | **Demolition**        | Heavy              |  100   |  85  |   110    | Deals 50% extra dmg to shields.               |
| 13  | **Steam Exhaust**     | AoE CC             |  125   |  45  |    15    | Blinds all nearby enemies.                    |
| 14  | **Titanium Armor**    | Buff               |  160   |  90  |    0     | Reduces all incoming dmg by 50% (2 turns).    |
| 15  | **Cataclysmic Crash** | Massive Nuke       |  190   | 130  |   300    | Crashes into the ground, huge damage to all.  |
| 16  | **Tank Stance**       | **Active Passive** |   10   |  0   |    -     | +20% Def, -10% Speed. Toggle.                 |
| 17  | **Siege Stance**      | **Active Passive** |   10   |  0   |    -     | +20% Dmg, -10% Def. Toggle.                   |
| 18  | **Utility Stance**    | **Active Passive** |   10   |  0   |    -     | +10% Speed and Cooldown Reduction. Toggle.    |
| 19  | **Overdrive**         | **Ultimate**       |   50   |  0   |    -     | Ignore Mana costs and +50% Speed for 3 turns. |
| 20  | **Nuclear Option**    | **Ultimate**       |   50   | 100  |    -     | Deals huge damage but resets Mana to 0.       |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
