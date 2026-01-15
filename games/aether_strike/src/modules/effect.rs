#[derive(Debug, Clone, PartialEq)]
pub enum StatType {
    Speed,
    Defense,
    Attack,
    Precision,
    CritRate,
}

#[derive(Debug, Clone, PartialEq)]
pub enum EffectType {
    InstantDamage, // Immediate HP reduction
    Heal,          // Immediate HP restoration
    Buff(StatType), // Increase stat for Duration
    Debuff(StatType), // Decrease stat for Duration
    Stun,          // Skip turn
    DoT,           // Damage over time: Value/turn
    HoT,           // Heal over time: Value/turn
}

#[derive(Debug, Clone)]
pub struct Effect {
    pub effect_type: EffectType,
    pub value: f32,       // e.g. 50 dmg, 10% buff
    pub duration: u32,    // 0 = instant, >0 = turns
    pub chance: f32,      // 0.0 to 1.0 (proc chance)
}

impl Effect {
    pub fn new(effect_type: EffectType, value: f32, duration: u32) -> Self {
        Self {
            effect_type,
            value,
            duration,
            chance: 1.0, 
        }
    }
}
