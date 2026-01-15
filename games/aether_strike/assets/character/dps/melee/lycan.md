# Lycan

**Role**: Melee DPS / Speed
**Sprite**: `character/sprites/lycan.png`
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 40, -55
**Sprite Cols**: 8
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 140
- **Mana**: 50 (Rage)
- **Speed**: 140 (Fastest)
- **Def**: 8
- **Crit Rate**: 10%
- **Precision**: 5
- **Element**: Physical

## ⚔️ Skill List (20 Total)

| ID  | Name                   | Type               | Unlock | Cost | Base Dmg | Description                        |
| :-- | :--------------------- | :----------------- | :----: | :--: | :------: | :--------------------------------- |
| 1   | **Claw Shred**         | Melee              |   1    |  0   |    8     | Very fast attack (Low CD).         |
| 2   | **Howl**               | Debuff             |   1    |  15  |    -     | Reduces enemy damage nearby.       |
| 3   | **Pounce**             | GapCloser          |   5    |  20  |    15    | Leap to enemy.                     |
| 4   | **Rend**               | DoT                |   8    |  10  |    5     | Applies bleeding for 3 turns.      |
| 5   | **Feral Bite**         | Lifesteal          |   12   |  25  |    20    | Heals for 50% damage dealt.        |
| 6   | **Savage Roar**        | Buff               |   18   |  30  |    0     | +20% Dmg for party.                |
| 7   | **Swift Swipe**        | Multi-hit          |   25   |  15  |    15    | Hits twice very quickly.           |
| 8   | **Intimidating Growl** | CC                 |   35   |  20  |    5     | Stuns non-bosses for 1 turn.       |
| 9   | **Blood Scent**        | Buff               |   45   |  25  |    0     | +30 Precision for 3 turns.         |
| 10  | **Lacerate**           | Heavy DoT          |   60   |  40  |    30    | Deep cuts, heavy bleeding.         |
| 11  | **Moonlight Blessing** | Self-Heal          |   80   |  50  |    0     | Restores 30% HP.                   |
| 12  | **Pack Leadership**    | Passive Buff       |  100   |  0   |    -     | All beasts in party gain +10% Dmg. |
| 13  | **Brutal Combo**       | Combo              |  125   |  60  |    90    | High damage multi-attack.          |
| 14  | **Unstoppable Force**  | Buff               |  160   |  80  |    0     | Immune to all CC (2 turns).        |
| 15  | **Alpha Fury**         | Massive Nuke       |  190   | 110  |   250    | The ultimate claw massacre.        |
| 16  | **Predator Stance**    | **Active Passive** |   10   |  0   |    -     | +15% Speed, +5% Crit. Toggle.      |
| 17  | **Survivor Stance**    | **Active Passive** |   10   |  0   |    -     | +10% Def, +5 HP/turn. Toggle.      |
| 18  | **Hunter Stance**      | **Active Passive** |   10   |  0   |    -     | Reveal hidden foes. Toggle.        |
| 19  | **Feral Frenzy**       | **Ultimate**       |   50   |  80  |    -     | +100% Attack Speed for 3 turns.    |
| 20  | **Full Moon**          | **Ultimate**       |   50   | 100  |    -     | Transform: Double HP & DMG.        |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
