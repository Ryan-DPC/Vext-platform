# Berserker

**Role**: Melee DPS / Burst
**Sprite**: `character/sprites/orc.png`
**Max Level**: 200
**Visual Scale**: 4.0
**Visual Offset**: 0, 30
**Sprite Cols**: 8
**Sprite Rows**: 6
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 160
- **Mana**: 120 (Rage)
- **Speed**: 110 (Fast)
- **Def**: 6
- **Crit Rate**: 12%
- **Precision**: 5
- **Element**: Physical

## ⚔️ Skill List (20 Total)

| ID  | Name                 | Type               | Unlock | Cost | Base Dmg | Description                                 |
| :-- | :------------------- | :----------------- | :----: | :--: | :------: | :------------------------------------------ |
| 1   | **Savage Strike**    | Basic              |   1    |  0   |    45    | Basic axe swing. High damage variation.     |
| 2   | **Bloodthirst**      | Self-Heal          |   1    |  15  |    8     | Deal damage and heal for 50%.               |
| 3   | **Enrage**           | Buff               |   5    |  20  |    0     | +20% Dmg taken, +40% Dmg dealt for 2 turns. |
| 4   | **Axethrow**         | Ranged             |   8    |  15  |    10    | Ranged damage.                              |
| 5   | **Leap Slam**        | GapCloser          |   12   |  25  |    15    | Jump to target, deal damage.                |
| 6   | **Intimidate**       | CC                 |   18   |  20  |    5     | Reduces enemy power for 2 turns.            |
| 7   | **Whirlwind**        | AoE                |   25   |  35  |    18    | Spins axes, hitting all adjacent.           |
| 8   | **Sever**            | DoT                |   35   |  30  |    10    | Applies heavy bleed.                        |
| 9   | **Reckless Abandon** | Buff               |   45   |  40  |    0     | +50% Crit Dmg, -30% Defense for 3 turns.    |
| 10  | **Execute**          | Finisher           |   60   |  50  |    80    | Massive damage to enemies under 25% HP.     |
| 11  | **Axe Mastery**      | Buff               |   80   |  30  |    0     | Passive dmg boost for 5 turns.              |
| 12  | **Crushing Blow**    | Heavy              |  100   |  60  |   120    | High damage, slow cooldown.                 |
| 13  | **Battle Cry**       | AoE Buff           |  125   |  50  |    0     | +15% Speed to all allies.                   |
| 14  | **Unyielding Fury**  | Buff               |  160   |  70  |    0     | Take zero damage from next 2 hits.          |
| 15  | **World Breaker**    | Ultimate Prime     |  190   | 150  |   300    | The ultimate destructive blow.              |
| 16  | **Berserker Stance** | **Active Passive** |   10   |  0   |    -     | +20% DMG, -20% Def. Toggle.                 |
| 17  | **Slayer Stance**    | **Active Passive** |   10   |  0   |    -     | +15% Crit Rate, +10% Speed. Toggle.         |
| 18  | **Titan Stance**     | **Active Passive** |   10   |  0   |    -     | +15% HP, +Aggro, -20% Dmg. Toggle.          |
| 19  | **Ragnarok**         | **Ultimate**       |   50   | 100  |    -     | Cannot die, 100% Crit chance for 3 turns.   |
| 20  | **Maelstrom**        | **Ultimate**       |   50   | 100  |    -     | Multi-hit AoE with high bleed.              |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
