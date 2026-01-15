# Vampire

**Role**: Melee DPS / Lifesteal
**Sprite**: `character/sprites/bat.png`
**Max Level**: 200
**Visual Scale**: 2.0
**Visual Offset**: 30, 0
**Sprite Cols**: 3
**Sprite Rows**: 1
**Sprite Frame Index**: 0

## 📊 Base Stats (Level 1)

- **HP**: 120
- **Mana**: 100 (Blood)
- **Speed**: 120
- **Def**: 6
- **Crit Rate**: 20%
- **Precision**: 20
- **Element**: Blood

## ⚔️ Skill List (20 Total)

| ID  | Name                  | Type               | Unlock | Cost | Base Dmg | Description                                         |
| :-- | :-------------------- | :----------------- | :----: | :--: | :------: | :-------------------------------------------------- |
| 1   | **Claw Swipe**        | Basic              |   1    |  0   |    10    | Basic attack.                                       |
| 2   | **Drain Life**        | Lifesteal          |   1    |  15  |    8     | Deals damage and heals for 100% dealt.              |
| 3   | **Bat Swarm**         | AoE                |   5    |  25  |    12    | Hits random targets, heals self.                    |
| 4   | **Hypnosis**          | CC                 |   8    |  20  |    0     | Stuns enemy for 1 turn.                             |
| 5   | **Blood Boil**        | DoT                |   12   |  30  |    15    | Causes blood damage over 3 turns.                   |
| 6   | **Mist Form**         | Utility            |   18   |  35  |    0     | Immune to physical damage for 1 turn.               |
| 7   | **Gorge**             | Lifesteal          |   25   |  45  |    30    | High damage bite, high healing.                     |
| 8   | **Crimson Pact**      | Buff               |   35   |  50  |    0     | Gain 50% Dmg, lose 5 HP per turn.                   |
| 9   | **Shadow Bolt**       | Range              |   45   |  30  |    25    | Projectile of pure shadow.                          |
| 10  | **Siphoning Aura**    | AoE                |   60   |  60  |    10    | Drains small HP from all enemies every turn.        |
| 11  | **Exsanguinate**      | Finisher           |   80   |  70  |    90    | Huge damage if target is bleeding.                  |
| 12  | **Night Terror**      | CC                 |  100   |  55  |    20    | Fears target for 2 turns.                           |
| 13  | **Vampiric Touch**    | Debuff             |  125   |  40  |    15    | Target takes more damage from all sources.          |
| 14  | **Coagulate**         | Defense            |  160   |  80  |    0     | Hardens blood, +50 Def for 2 turns.                 |
| 15  | **Overlord's Wrath**  | Massive Nuke       |  190   | 130  |   250    | Devastates all foes with blood magic.               |
| 16  | **Gothic Stance**     | **Active Passive** |   10   |  0   |    -     | +20% Lifesteal. Toggle.                             |
| 17  | **Nocturnal Stance**  | **Active Passive** |   10   |  0   |    -     | +15% Speed and Precision. Toggle.                   |
| 18  | **Aristocrat Stance** | **Active Passive** |   10   |  0   |    -     | +20% Mana Regen. Toggle.                            |
| 19  | **Eternal Night**     | **Ultimate**       |   50   | 100  |    -     | Transforms into true form. Massive Lifesteal & Dmg. |
| 20  | **Blood Legion**      | **Ultimate**       |   50   | 100  |    -     | Summons 3 blood clones to attack enemies.           |

> **Note**:
>
> - **Active Passive**: Only 1 active at a time.
> - **Ultimate**: Mutually exclusive choice in Skill Tree.
