# Paladin

**Role**: Tank / Support / Melee
**Sprite**: `character/sprites/soldier.png`
**Max Level**: 200
**Visual Scale**: 4.0
**Visual Offset**: 0, 30
**Sprite Cols**: 9
**Sprite Rows**: 7
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 160
- **Mana**: 80 (Holy Power)
- **Speed**: 0.9 (Slow)
- **Def**: 12
- **Crit Rate**: 5%
- **Precision**: 10
- **Element**: Light

## ⚔️ Skill List (20 Total)

| ID  | Name                    | Type               | Unlock | Cost | Base Dmg | Description                                     |
| :-- | :---------------------- | :----------------- | :----: | :--: | :------: | :---------------------------------------------- |
| 1   | **Holy Strike**         | Basic              |   1    |  5   |    8     | Melee dmg + small self heal.                    |
| 2   | **Shield of Light**     | Buff               |   1    |  15  |    0     | Absorb 20 dmg for ally.                         |
| 3   | **Correction**          | Melee              |   5    |  10  |    10    | Bonus dmg to undead/demons.                     |
| 4   | **Blessing of Might**   | Buff               |   8    |  20  |    0     | +10% Dmg to target ally for 3 turns.            |
| 5   | **Judgement**           | Range              |   12   |  25  |    15    | Ranged holy damage.                             |
| 6   | **Consecration**        | AoE                |   18   |  40  |    5     | Holy ground deals DoT to all enemies.           |
| 7   | **Lay on Hands**        | Huge Heal          |   25   |  60  |    0     | Consumes 50% Mana to heal 50% HP.               |
| 8   | **Hammer of Wrath**     | Finisher           |   35   |  30  |    40    | Can only be used on targets < 20% HP.           |
| 9   | **Divine Shield**       | Defense            |   45   |  80  |    0     | Invulnerable for 1 turn.                        |
| 10  | **Aura of Mercy**       | Passive Buff       |   60   |  0   |    0     | Allies regenerate 2% HP per turn.               |
| 11  | **Holy Fire**           | DoT                |   80   |  35  |    20    | Burns target with holy energy.                  |
| 12  | **Avenging Wrath**      | Powerful Buff      |  100   |  90  |    0     | +30% Dmg and Healing for 3 turns.               |
| 13  | **Cleanse**             | Utility            |  125   |  20  |    0     | Removes all debuffs from an ally.               |
| 14  | **Guardian of Ancient** | Summon             |  160   | 100  |    -     | Summon spirit to defend party.                  |
| 15  | **Final Reckoning**     | Massive AoE        |  190   | 120  |   180    | High holy damage to all enemies.                |
| 16  | **Devotion Stance**     | **Active Passive** |   10   |  0   |    -     | +10% Defense to all allies. Toggle.             |
| 17  | **Retribution Stance**  | **Active Passive** |   10   |  0   |    -     | Converts 10% Def into Dmg. Toggle.              |
| 18  | **Crusader Stance**     | **Active Passive** |   10   |  0   |    -     | +15% Speed and Crit Rate. Toggle.               |
| 19  | **Divine Intervention** | **Ultimate**       |   50   | 100  |    -     | Sacrifices 50% HP to fully heal/rez all allies. |
| 20  | **Shield of Valhalla**  | **Ultimate**       |   50   | 100  |    -     | Entire party becomes immune to dmg (2 turns).   |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
