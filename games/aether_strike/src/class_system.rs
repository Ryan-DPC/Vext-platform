use macroquad::prelude::*;
use std::fs;
use std::path::Path;

/// Type de passif
#[derive(Debug, Clone)]
pub struct Passive {
    pub name: String,
    pub description: String,
    pub effect: PassiveEffect,
}

#[derive(Debug, Clone, Copy)]
pub enum PassiveEffect {
    IncreaseDamage(f32),      // Augmente les dégâts de X%
    IncreaseDefense(f32),     // Réduit les dégâts reçus de X%
    ManaRegen(f32),           // Régénération de mana +X par seconde
    LifeSteal(f32),           // Vol de vie X% des dégâts infligés
    CriticalChance(f32),      // Chance de coup critique X%
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum SkillCategory {
    Damage,
    Heal,
    Buff,
    Debuff,
    Summon,
    Utility,
}

impl SkillCategory {
    pub fn can_target_ally(&self) -> bool {
        match self {
            Self::Heal | Self::Buff | Self::Utility => true,
            _ => false,
        }
    }

    pub fn can_target_enemy(&self) -> bool {
         match self {
            Self::Damage | Self::Debuff | Self::Utility => true,
            _ => false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Skill {
    pub id: u32,
    pub name: String,
    pub skill_type: String,
    pub unlock_level: u32,
    pub mana_cost: u32,
    pub base_damage: f32,
    pub description: String,
}

impl Skill {
    pub fn get_effects(&self) -> Vec<crate::modules::effect::Effect> {
        use crate::modules::effect::{Effect, EffectType, StatType};
        let mut effects = Vec::new();
        let t = self.skill_type.to_lowercase();
        let desc = self.description.to_lowercase();
        let val = self.base_damage;

        // HEAL
        if t.contains("heal") || t.contains("restore") || t.contains("lifesteal") {
             effects.push(Effect::new(EffectType::Heal, val.max(20.0), 0));
        } 
        
        // BUFF
        else if t.contains("buff") || t.contains("shield") || t.contains("stance") {
             if desc.contains("speed") { effects.push(Effect::new(EffectType::Buff(StatType::Speed), 20.0, 3)); }
             else if desc.contains("def") { effects.push(Effect::new(EffectType::Buff(StatType::Defense), 15.0, 3)); }
             else {
                 // Default Buff
                 effects.push(Effect::new(EffectType::Buff(StatType::Attack), 10.0, 3));
             }
        } 

        // DEBUFF / CC
        else if t.contains("debuff") || t.contains("cc") || t.contains("slow") || t.contains("stun") {
             if t.contains("stun") { effects.push(Effect::new(EffectType::Stun, 0.0, 1)); }
             else if t.contains("slow") { effects.push(Effect::new(EffectType::Debuff(StatType::Speed), 30.0, 2)); }
             else {
                 effects.push(Effect::new(EffectType::Debuff(StatType::Defense), 10.0, 2));
             }
             // Most debuffs also deal some damage? Check base_damage
             if val > 0.0 {
                 effects.push(Effect::new(EffectType::InstantDamage, val, 0));
             }
        } 

        // SUMMON
        else if t.contains("summon") {
            // No effect mapping for summon yet
        }

        // DEFAULT DAMAGE
        else {
             effects.push(Effect::new(EffectType::InstantDamage, val, 0));
        }
        
        effects
    }
}

#[derive(Debug, Clone)]
pub struct CharacterClass {
    pub name: String,
    pub role: String,
    pub sprite_path: String,
    pub max_level: u32,
    pub hp: f32,
    pub mana: u32,
    pub speed: f32,
    pub defense: f32,
    pub crit_rate: f32,
    pub precision: u32,
    pub element: String,
    pub visual_scale: f32,
    pub visual_offset_x: f32,
    pub visual_offset_y: f32,
    pub sprite_frames_x: u32,
    pub sprite_frames_y: u32,
    pub sprite_frame_index: u32,
    pub skills: Vec<Skill>,
}

impl CharacterClass {
    pub fn load_all() -> Vec<Self> {
        let mut classes = Vec::new();
        let sub_paths = [
            "character/dps/melee",
            "character/dps/ranged",
            "character/tank/melee",
            "character/support/ranged",
        ];

        let base_paths = [
            "assets", 
            "games/aether_strike/assets", 
            "../assets",
            "./assets"
        ];

        for base in base_paths {
            for sub in sub_paths {
                let full_path = Path::new(base).join(sub);
                if let Ok(entries) = fs::read_dir(&full_path) {
                    println!("📂 Searching in: {:?}", full_path);
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                                if let Some(cls) = Self::from_file(&path) {
                                    println!("  ✨ Loaded class: {}", cls.name);
                                    classes.push(cls);
                                } else {
                                    println!("  ⚠️ Failed to parse: {:?}", path);
                                }
                            }
                        }
                    }
                }
            }
            if !classes.is_empty() {
                break; // On a trouvé nos classes, on arrête de chercher plus loin
            }
        }
        
        if classes.is_empty() {
            println!("❌ CRITICAL: No classes found in any of the base paths!");
        }
        
        classes
    }

    pub fn from_file(path: &Path) -> Option<Self> {
        let content = fs::read_to_string(path).ok()?;
        let mut lines = content.lines();

        let name = lines.next()?.trim_start_matches("# ").to_string();
        let mut role = String::new();
        let mut sprite_path = String::new();
        let mut max_level = 200;
        let mut hp = 100.0;
        let mut mana = 100;
        let mut speed = 1.0;
        let mut defense = 10.0;
        let mut crit_rate = 0.05;
        let mut precision = 10;
        let mut element = "Physical".to_string();
        let mut visual_scale = 1.0;
        let mut visual_offset_x = 0.0;
        let mut visual_offset_y = 0.0;
        let mut sprite_frames_x = 1;
        let mut sprite_frames_y = 1;
        let mut sprite_frame_index = 0;
        let mut skills = Vec::new();


        let mut in_stats = false;
        let mut in_skills = false;

        for line in lines {
            if line.contains("**Role**") {
                role = line.split(':').nth(1)?.trim().to_string();
            } else if line.contains("**Sprite**") {
                sprite_path = line.split(':').nth(1)?.trim().trim_matches('`').to_string();
            } else if line.contains("**Max Level**") {
                max_level = line.split(':').nth(1)?.trim().parse().unwrap_or(200);
            } else if line.contains("**Visual Scale**") {
                visual_scale = line.split(':').nth(1)?.trim().parse().unwrap_or(1.0);
            } else if line.contains("**Visual Offset**") {
                let val = line.split(':').nth(1)?.trim();
                let parts: Vec<&str> = val.split(',').collect();
                if parts.len() >= 2 {
                    visual_offset_x = parts[0].trim().parse().unwrap_or(0.0);
                    visual_offset_y = parts[1].trim().parse().unwrap_or(0.0);
                }
            } else if line.contains("**Sprite Frame Index**") {
                sprite_frame_index = line.split(':').nth(1)?.trim().parse().unwrap_or(0);
            } else if line.contains("**Sprite Cols**") {
                sprite_frames_x = line.split(':').nth(1).unwrap_or("1").trim().parse().unwrap_or(1);
            } else if line.contains("**Sprite Rows**") {
                sprite_frames_y = line.split(':').nth(1).unwrap_or("1").trim().parse().unwrap_or(1);
            } else if line.contains("**Sprite Frames**") && !line.contains(" X") && !line.contains(" Y") {
                let val = line.split(':').nth(1).unwrap_or("1").trim();
                if val.contains('x') {
                    let parts: Vec<&str> = val.split('x').collect();
                    if parts.len() >= 2 {
                        sprite_frames_x = parts[0].trim().parse().unwrap_or(1);
                        sprite_frames_y = parts[1].trim().parse().unwrap_or(1);
                    }
                } else {
                    sprite_frames_x = val.parse().unwrap_or(1);
                }
            } else if line.contains("Base Stats") {
                in_stats = true;
                in_skills = false;
            } else if line.contains("Skill List") {
                in_stats = false;
                in_skills = true;
            } else if in_stats && line.starts_with("- ") {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() >= 2 {
                    let key = parts[0].trim_start_matches("- **").trim_end_matches("**").trim();
                    let val = parts[1].trim();
                    match key {
                        "HP" => hp = val.parse().unwrap_or(100.0),
                        "Mana" => mana = val.split(' ').next()?.parse().unwrap_or(100),
                        "Speed" => speed = val.split(' ').next()?.parse().unwrap_or(1.0),
                        "Def" | "Defense" => defense = val.split(' ').next()?.parse().unwrap_or(0.0),
                        "Crit Rate" => crit_rate = val.trim_end_matches('%').parse::<f32>().unwrap_or(5.0) / 100.0,
                        "Precision" => precision = val.parse().unwrap_or(10),
                        "Element" => element = val.to_string(),
                        _ => {}
                    }
                }
            } else if in_skills && line.contains('|') && !line.contains("ID") && !line.contains("---") {
                let cols: Vec<&str> = line.split('|').map(|s| s.trim()).collect();
                if cols.len() >= 8 {
                    skills.push(Skill {
                        id: cols[1].parse().unwrap_or(0),
                        name: cols[2].trim_matches('*').to_string(),
                        skill_type: cols[3].to_string(),
                        unlock_level: cols[4].parse().unwrap_or(1),
                        mana_cost: cols[5].parse().unwrap_or(0),
                        base_damage: cols[6].parse().unwrap_or(0.0),
                        description: cols[7].to_string(),
                    });
                }
            }
        }

        Some(Self {
            name,
            role,
            sprite_path,
            max_level,
            hp,
            mana,
            speed,
            defense,
            crit_rate,
            precision,
            element,
            visual_scale,
            visual_offset_x,
            visual_offset_y,
            sprite_frames_x,
            sprite_frames_y,
            sprite_frame_index,
            skills,
        })
    }

    pub fn color(&self) -> Color {
        match self.role.to_lowercase().as_str() {
            r if r.contains("tank") => Color::from_rgba(200, 50, 50, 255),
            r if r.contains("dps") && r.contains("ranged") => Color::from_rgba(50, 100, 200, 255),
            r if r.contains("dps") && r.contains("melee") => Color::from_rgba(200, 150, 50, 255),
            r if r.contains("support") => Color::from_rgba(50, 200, 100, 255),
            _ => WHITE,
        }
    }
}
