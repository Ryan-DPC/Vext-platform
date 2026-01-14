# Necromancer

**Role**: Support / Summoner / Ranged
**Sprite**: `character/sprites/necromancer.png`
**Max Level**: 200
**Visual Scale**: 1.5
**Visual Offset**: 50, -35
**Sprite Cols**: 14
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 130
- **Mana**: 120 (Soul Essence)
- **Speed**: 0.9
- **Def**: 8
- **Crit Rate**: 5%
- **Precision**: 10
- **Element**: Void

## ⚔️ Skill List (20 Total)

| ID  | Name                  | Type               | Unlock | Cost | Base Dmg | Description                                 |
| :-- | :-------------------- | :----------------- | :----: | :--: | :------: | :------------------------------------------ |
| 1   | **Shadow Bolt**       | Range              |   1    |  5   |    10    | Dark damage.                                |
| 2   | **Raise Skeleton**    | Summon             |   1    |  20  |    -     | Summons a Skeleton Warrior (2 turns).       |
| 3   | **Life Tap**          | Utility            |   5    |  0   |    -     | Sacrifices 10 HP to gain 20 Mana.           |
| 4   | **Bone Shield**       | Defense            |   8    |  15  |    0     | Absorbs 30 damage for ally or self.         |
| 5   | **Curse of Weakness** | Debuff             |   12   |  25  |    0     | Reduces target damage by 20%.               |
| 6   | **Soul Blast**        | Range              |   18   |  30  |    25    | Consumes a soul (if available) for 2x dmg.  |
| 7   | **Summon Spectre**    | Summon             |   25   |  40  |    -     | Summons a ghost that debuffs foes.          |
| 8   | **Corpse Explosion**  | AoE Nuke           |   35   |  45  |    50    | Needs an ally/enemy to have died recently.  |
| 9   | **Dark Ritual**       | Buff               |   45   |  50  |    0     | +20% Spell Dmg for 3 turns.                 |
| 10  | **Drain Soul**        | DoT Lifesteal      |   60   |  35  |    15    | Drains HP over 3 turns.                     |
| 11  | **Graveyard Pact**    | AoE Buff           |   80   |  60  |    0     | All summons gain +20% stats.                |
| 12  | **Lich's Touch**      | CC                 |  100   |  50  |    10    | Turns enemy to stone for 1 turn.            |
| 13  | **Vile Infection**    | DoT AoE            |  125   |  55  |    10    | Spreads disease to all enemies.             |
| 14  | **Undeath**           | Utility            |  160   |  90  |    -     | Brings a fallen ally back as a zombie.      |
| 15  | **Void Rupture**      | Massive AoE        |  190   | 130  |   180    | Huge dark damage to all foes.               |
| 16  | **Graveyard Stance**  | **Active Passive** |   10   |  0   |    -     | Summons are 20% stronger. Toggle.           |
| 17  | **Reaper Stance**     | **Active Passive** |   10   |  0   |    -     | +20% Spell DMG, -20% HP. Toggle.            |
| 18  | **Blood Stance**      | **Active Passive** |   10   |  0   |    -     | Gain Mana when taking dmg. Toggle.          |
| 19  | **Army of the Dead**  | **Ultimate**       |   50   | 100  |    -     | Summons 5 Skeletons and buffs them.         |
| 20  | **Soul Reaper**       | **Ultimate**       |   50   | 100  |    -     | Massive single target hit with 50% execute. |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
