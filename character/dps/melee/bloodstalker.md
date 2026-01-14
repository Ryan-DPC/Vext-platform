# Bloodstalker

**Role**: Melee DPS / Lifesteal / Bleed
**Sprite**: `character/sprites/bloodstalker.png`
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 40, -55
**Sprite Cols**: 8
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 150
- **Mana**: 60 (Blood)
- **Speed**: 1.2
- **Def**: 7
- **Crit Rate**: 15%
- **Precision**: 10
- **Element**: Blood

## ⚔️ Skill List (20 Total)

| ID  | Name                    | Type               | Unlock | Cost | Base Dmg | Description                                              |
| :-- | :---------------------- | :----------------- | :----: | :--: | :------: | :------------------------------------------------------- |
| 1   | **Rend Flesh**          | Melee              |   1    |  5   |    10    | Applies Bleed.                                           |
| 2   | **Taste of Blood**      | Passive            |   1    |  0   |    -     | Heal for 10% of damage dealt versus bleeding targets.    |
| 3   | **Blood Scent**         | Buff               |   5    |  10  |    0     | Reveal invisible enemies.                                |
| 4   | **Claw Slash**          | Basic              |   8    |  0   |    8     | Fast basic attack.                                       |
| 5   | **Hemophilic Strike**   | Debuff             |   12   |  15  |    12    | Increases bleeding damage on target.                     |
| 6   | **Savage Lunge**        | GapCloser          |   18   |  25  |    15    | Pounce from afar.                                        |
| 7   | **Bleed Out**           | Finisher           |   25   |  40  |    50    | Deals damage based on target's missing HP.               |
| 8   | **Crimson Roar**        | AoE Buff           |   35   |  30  |    0     | +10% Crit Rate to party.                                 |
| 9   | **Blood Armor**         | Defense            |   45   |  35  |    0     | Gains shield by sacrificing 10% HP.                      |
| 10  | **Stalking Shadow**     | Utility            |   60   |  20  |    0     | Target enemy misses their next attack.                   |
| 11  | **Exsanguinating Bite** | Lifesteal          |   80   |  45  |    25    | Huge heal on hit.                                        |
| 12  | **Flesh Ripper**        | Heavy              |  100   |  55  |    90    | High damage, heavy bleed.                                |
| 13  | **Vein Splitter**       | AoE                |  125   |  50  |    30    | Hits all enemies with a blood wave.                      |
| 14  | **Heart Seeker**        | Finisher           |  160   |  70  |   150    | Massive damage if target is below 15% HP.                |
| 15  | **Eternal Thirst**      | Massive Nuke       |  190   | 110  |   300    | Ultimate bloodlust frenzy.                               |
| 16  | **Vampiric Stance**     | **Active Passive** |   10   |  0   |    -     | +15% Lifesteal. Toggle.                                  |
| 17  | **Stalker Stance**      | **Active Passive** |   10   |  0   |    -     | +20% Speed. Toggle.                                      |
| 18  | **Blood Stance**        | **Active Passive** |   10   |  0   |    -     | Bleeding enemies take 10% more dmg. Toggle.              |
| 19  | **Crimson Feast**       | **Ultimate**       |   50   | 100  |    80    | High Dmg. Heals all allies based on damage.              |
| 20  | **Heartstopper**        | **Ultimate**       |   50   | 100  |    -     | Instantly kill a low HP enemy (Bosses take massive dmg). |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
