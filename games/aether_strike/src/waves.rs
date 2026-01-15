use macroquad::prelude::*;
pub use crate::entities::enemy::{Enemy, EnemyStats, EnemyType};

pub struct WaveConfig {
    pub title: String,
    pub description: String,
    /// (EnemyStats, Count, PositionOffset)
    pub enemies: Vec<(EnemyStats, EnemyType, Vec2)>,
    pub is_boss_wave: bool,
}

pub struct WaveManager {
    pub current_wave_index: usize,
    pub waves: Vec<WaveConfig>,
    pub wave_timer: f32, // Delay between waves
    pub state: WaveState,
}

#[derive(PartialEq)]
pub enum WaveState {
    WaitingToStart,
    Spawning,
    Active,
    WaveCleared,
    AllWavesCleared,
}

impl WaveManager {
    pub fn new() -> Self {
        WaveManager {
            current_wave_index: 0,
            waves: define_waves(),
            wave_timer: 0.0,
            state: WaveState::WaitingToStart,
        }
    }

    pub fn update(&mut self, dt: f32, enemies_alive: usize, boss_alive: bool) {
        match self.state {
            WaveState::WaitingToStart => {
                self.wave_timer += dt;
                if self.wave_timer > 2.0 {
                    self.state = WaveState::Spawning;
                }
            }
            WaveState::Spawning => {
                // Spawning is handled by the caller getting the wave config
                // We just transition to Active immediately after caller spawns
                self.state = WaveState::Active;
            }
            WaveState::Active => {
                if enemies_alive == 0 && !boss_alive {
                    self.state = WaveState::WaveCleared;
                    self.wave_timer = 0.0;
                }
            }
            WaveState::WaveCleared => {
                self.wave_timer += dt;
                if self.wave_timer > 3.0 { // 3 seconds break
                    self.current_wave_index += 1;
                    if self.current_wave_index >= self.waves.len() {
                        self.state = WaveState::AllWavesCleared;
                    } else {
                        self.state = WaveState::Spawning;
                    }
                }
            }
            WaveState::AllWavesCleared => {
                // Game Over - Victory
            }
        }
    }

    pub fn get_current_wave(&self) -> Option<&WaveConfig> {
        self.waves.get(self.current_wave_index)
    }
}

fn define_waves() -> Vec<WaveConfig> {
    let mut waves = Vec::new();

    // === PRESETS ===
    let minion_stats = EnemyStats {
        name: "Shadow Minion".to_string(),
        hp: 60.0,
        damage: 12.0,
        speed: 90.0,
        attack_range: 50.0,
        attack_cooldown: 1.8,
        gold_reward: 10,
        color: Color::from_rgba(100, 100, 100, 255),
        scale: 1.5,
    };

    let elite_stats = EnemyStats {
        name: "Void Crawler".to_string(),
        hp: 150.0,
        damage: 25.0,
        speed: 75.0,
        attack_range: 60.0,
        attack_cooldown: 2.0,
        gold_reward: 35,
        color: Color::from_rgba(100, 50, 150, 255),
        scale: 1.8,
    };

    let boss_stats = EnemyStats {
        name: "Aether Guardian".to_string(),
        hp: 800.0,
        damage: 45.0,
        speed: 60.0,
        attack_range: 80.0,
        attack_cooldown: 2.5,
        gold_reward: 500,
        color: Color::from_rgba(200, 50, 50, 255),
        scale: 2.5,
    };

    // WAVE 1: 3 Minions
    waves.push(WaveConfig {
        title: "Wave 1: Shadows Emergence".to_string(),
        description: "Defeat the initial wave of Shadow Minions.".to_string(),
        enemies: vec![
            (minion_stats.clone(), EnemyType::Minion, vec2(790.0, 200.0)),
            (minion_stats.clone(), EnemyType::Minion, vec2(890.0, 360.0)),
            (minion_stats.clone(), EnemyType::Minion, vec2(790.0, 460.0)),
        ],
        is_boss_wave: false,
    });

    // WAVE 2: 2 Minions + 1 Elite
    waves.push(WaveConfig {
        title: "Wave 2: The Void Crawlers".to_string(),
        description: "Stronger enemies are approaching!".to_string(),
        enemies: vec![
            (minion_stats.clone(), EnemyType::Minion, vec2(790.0, 200.0)),
            (elite_stats.clone(), EnemyType::Elite, vec2(850.0, 330.0)), // Elite Center
            (minion_stats.clone(), EnemyType::Minion, vec2(790.0, 460.0)),
        ],
        is_boss_wave: false,
    });

    // WAVE 3: BOSS
    waves.push(WaveConfig {
        title: "FINAL WAVE: Aether Guardian".to_string(),
        description: "Defeat the Guardian to claim the Aether!".to_string(),
        enemies: vec![
            (boss_stats.clone(), EnemyType::Boss, vec2(750.0, 320.0)),
            (minion_stats.clone(), EnemyType::Minion, vec2(850.0, 200.0)), // Support Minion
            (minion_stats.clone(), EnemyType::Minion, vec2(850.0, 440.0)), // Support Minion
        ],
        is_boss_wave: true,
    });

    waves
}
