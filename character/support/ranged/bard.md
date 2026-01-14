# Bard

**Role**: Support / Ranged
**Sprite**: `character/sprites/satyr.png`
**Max Level**: 200
**Visual Scale**: 1.5
**Visual Offset**: 40, 0
**Sprite Cols**: 10
**Sprite Rows**: 11
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 110
- **Mana**: 100
- **Speed**: 1.1
- **Def**: 5
- **Crit Rate**: 10%
- **Precision**: 20
- **Element**: Nature

## ⚔️ Skill List (20 Total)

| ID  | Name               | Type               | Unlock | Cost | Base Dmg | Description                               |
| :-- | :----------------- | :----------------- | :----: | :--: | :------: | :---------------------------------------- |
| 1   | **Note Strike**    | Ranged             |   1    |  5   |    8     | Musical projectile.                       |
| 2   | **Soothing Song**  | Heal               |   1    |  10  |    10    | Heals target ally.                        |
| 3   | **Anthem of War**  | Buff               |   5    |  20  |    0     | +10% Dmg to party for 2 turns.            |
| 4   | **Dissonance**     | CC                 |   8    |  15  |    5     | Chances to stun target for 1 turn.        |
| 5   | **Inspire**        | Mana Restore       |   12   |  10  |    0     | Restores 20 Mana to target ally.          |
| 6   | **Lullaby**        | Hard CC            |   18   |  30  |    0     | Puts target to sleep for 2 turns.         |
| 7   | **Healing Chorus** | AoE Heal           |   25   |  45  |    15    | Heals entire party for 15 HP.             |
| 8   | **Echoing Blast**  | Burst              |   35   |  35  |    30    | Hits twice if target is debuffed.         |
| 9   | **Battle March**   | Speed Buff         |   45   |  25  |    0     | +20% Speed to party for 3 turns.          |
| 10  | **Mind Melody**    | Debuff             |   60   |  40  |    10    | Reduces target precision by 30.           |
| 11  | **Siren Song**     | Charm              |   80   |  50  |    0     | Enemy has 50% chance to attack ally.      |
| 12  | **Riff of Power**  | Powerful Buff      |  100   |  70  |    0     | Target ally gains 100% Crit for 1 hit.    |
| 13  | **Discordant Pop** | DoT                |  125   |  40  |    25    | Musical boom causing bleeding ears.       |
| 14  | **Requiem**        | Debuff             |  160   |  90  |    0     | Reduces enemy power by 50% (3 turns).     |
| 15  | **Finale**         | Massive Nuke       |  190   | 130  |   150    | Huge sonic damage to all foes.            |
| 16  | **Harmony Stance** | **Active Passive** |   10   |  0   |    -     | +20% Healing power. Toggle.               |
| 17  | **Tempo Stance**   | **Active Passive** |   10   |  0   |    -     | +15% Speed and Evasion. Toggle.           |
| 18  | **Melody Stance**  | **Active Passive** |   10   |  0   |    -     | Reduces mana costs by 20%. Toggle.        |
| 19  | **Encore**         | **Ultimate**       |   50   | 100  |    -     | Refresh all cooldowns for party members.  |
| 20  | **Symphony**       | **Ultimate**       |   50   | 100  |    -     | Massive party buff: +50% Stats (3 turns). |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
