use macroquad::prelude::*;
use crate::game::GameState;
use crate::class_system::CharacterClass;

#[derive(Debug, Clone, PartialEq)]
pub enum BattleUIState {
    Main,
    AttackMenu,
    BagMenu,
    PassiveInfo,
    Defeat,
}

#[derive(Debug, Clone)]
pub enum HUDAction {
    UseAttack(String),
    UseItem(crate::inventory::ItemType),
    Resurrect,
    GiveUp,
    Flee,
    EndTurn,
}

// Mock team member for UI prototyping
#[derive(Debug, Clone)]
pub struct MockTeamMember {
    pub name: String,
    pub class: String,
    pub hp: f32,
    pub max_hp: f32,
    pub is_player: bool,
}

// Mock enemy for UI prototyping
#[derive(Debug, Clone)]
pub struct MockEnemy {
    pub name: String,
    pub hp: f32,
    pub max_hp: f32,
    pub is_boss: bool,
}

pub struct HUD;

impl HUD {
    pub fn draw(
        game_state: &GameState, 
        screen_width: f32, 
        screen_height: f32, 
        character_name: &str, 
        character_class: &CharacterClass,
        _other_players: &std::collections::HashMap<String, crate::network_client::RemotePlayer>,
        enemy_hp_percent: f32,
        is_my_turn: bool,
        ui_state: &mut BattleUIState,
        combat_logs: &[String],
    ) -> Option<HUDAction> {
        let mut result_action = None;
        let padding = 12.0;
        
        // ============================================================
        // MOCK DATA FOR TEAM UI PROTOTYPE
        // ============================================================
        let mock_team: Vec<MockTeamMember> = vec![
            MockTeamMember {
                name: character_name.to_string(),
                class: character_class.name.clone(),
                hp: game_state.resources.current_hp,
                max_hp: game_state.resources.max_hp,
                is_player: true,
            },
            MockTeamMember {
                name: "DarkKnight".to_string(),
                class: "Void Knight".to_string(),
                hp: 120.0,
                max_hp: 150.0,
                is_player: false,
            },
            MockTeamMember {
                name: "Elara".to_string(),
                class: "Storm Mage".to_string(),
                hp: 45.0,
                max_hp: 80.0,
                is_player: false,
            },
            MockTeamMember {
                name: "SwiftArrow".to_string(),
                class: "Ranger".to_string(),
                hp: 90.0,
                max_hp: 110.0,
                is_player: false,
            },
        ];

        let mock_enemies: Vec<MockEnemy> = vec![
            MockEnemy {
                name: "Aether Guardian".to_string(),
                hp: enemy_hp_percent * 500.0,
                max_hp: 500.0,
                is_boss: true,
            },
            MockEnemy {
                name: "Shadow Minion".to_string(),
                hp: 50.0,
                max_hp: 80.0,
                is_boss: false,
            },
            MockEnemy {
                name: "Dark Spirit".to_string(),
                hp: 40.0,
                max_hp: 60.0,
                is_boss: false,
            },
            MockEnemy {
                name: "Void Crawler".to_string(),
                hp: 75.0,
                max_hp: 100.0,
                is_boss: false,
            },
        ];

        // ============================================================
        // TOP: TIMELINE (Turn Order)
        // ============================================================
        let timeline_y = 10.0;
        let center_x = screen_width / 2.0;
        
        let turn_order = vec![
            (true, "You", Color::from_rgba(50, 100, 200, 255)), // Player
            (false, "Boss", Color::from_rgba(200, 50, 50, 255)), // Boss
            (true, "Ally", Color::from_rgba(200, 50, 50, 255)), // Warrior
            (true, "Ally", Color::from_rgba(60, 200, 100, 255)), // Archer
        ];

        let icon_size = 30.0;
        let gap = 10.0;
        let total_w = turn_order.len() as f32 * (icon_size + gap) - gap;
        let start_x = center_x - total_w / 2.0;
        for (i, (_is_ally, label, color)) in turn_order.iter().enumerate() {
            let x = start_x + i as f32 * (icon_size + gap);
            let y = timeline_y + 5.0;
            
            let active_index = if is_my_turn { 0 } else { 1 };
            
            if i == active_index {
                draw_rectangle(x - 2.0, y - 2.0, icon_size + 4.0, icon_size + 4.0, GOLD);
            }

            draw_rectangle(x, y, icon_size, icon_size, *color);
            draw_rectangle_lines(x, y, icon_size, icon_size, 1.0, WHITE);
            draw_text(&label[0..1], x + 8.0, y + 20.0, 20.0, WHITE);
        }

        // ============================================================
        // TEAM PANEL
        // ============================================================
        let team_panel_w = 180.0;
        let team_panel_h = 260.0; // Trimmed to fit content exactly (max y ~250)
        
        draw_rectangle(0.0, 0.0, team_panel_w, team_panel_h, Color::from_rgba(15, 20, 30, 240));
        draw_line(team_panel_w, 0.0, team_panel_w, team_panel_h, 2.0, Color::from_rgba(60, 80, 120, 255));
        
        for (i, member) in mock_team.iter().enumerate() {
            let (height, font_size_name, font_size_small) = if member.is_player {
                (70.0, 14.0, 11.0)
            } else {
                (45.0, 11.0, 9.0)
            };
            
            let y = if i == 0 { 5.0 } else { 5.0 + 80.0 + (i as f32 - 1.0) * 60.0 }; 

            let bg_color = if member.is_player {
                Color::from_rgba(50, 60, 80, 220)
            } else {
                Color::from_rgba(25, 30, 40, 200)
            };
            draw_rectangle(padding - 5.0, y - 5.0, team_panel_w - padding * 2.0 + 10.0, height, bg_color);
            
            let class_color = if member.is_player { character_class.color() } else { GRAY };
            
            let name_color = if member.is_player { GOLD } else { WHITE };
            let display_name = if member.is_player { 
                format!("{} (You)", member.name) 
            } else { 
                member.name.clone() 
            };
            draw_text(&display_name, padding + 5.0, y + 10.0, font_size_name, name_color);
            draw_text(&member.class, padding + 5.0, y + 10.0 + font_size_name, font_size_small, class_color);
            
            let hp_bar_w = team_panel_w - padding * 2.0 - 10.0;
            let hp_percent = (member.hp / member.max_hp).clamp(0.0, 1.0);
            let hp_bar_y = y + 12.0 + font_size_name + 4.0;
            let hp_bar_h = if member.is_player { 12.0 } else { 8.0 };
            
            draw_rectangle(padding + 5.0, hp_bar_y, hp_bar_w, hp_bar_h, Color::from_rgba(40, 15, 15, 255));
            let hp_color = if hp_percent > 0.5 { GREEN } else if hp_percent > 0.25 { YELLOW } else { RED };
            draw_rectangle(padding + 5.0, hp_bar_y, hp_bar_w * hp_percent, hp_bar_h, hp_color);
            
            if member.is_player {
                let mp_percent = game_state.resources.mana as f32 / game_state.resources.max_mana as f32;
                let mp_bar_y = hp_bar_y + hp_bar_h + 4.0;
                let mp_bar_h = 8.0;

                draw_rectangle(padding + 5.0, mp_bar_y, hp_bar_w, mp_bar_h, Color::from_rgba(10, 10, 40, 255));
                draw_rectangle(padding + 5.0, mp_bar_y, hp_bar_w * mp_percent.clamp(0.0, 1.0), mp_bar_h, Color::from_rgba(50, 100, 250, 255));
            }
        }

        // ============================================================
        // ENEMIES PANEL
        // ============================================================
        let enemy_panel_w = 200.0;
        let enemy_panel_x = screen_width - enemy_panel_w;
        
        // Height needs to fit Boss + 3 minions. Boss ~60px, Minions ~60px each?
        // Loop uses `y = 15 + i*60`. 4 items => 15 + 3*60 = 195. Plus padding ~40 => 240.
        draw_rectangle(enemy_panel_x, 0.0, enemy_panel_w, 250.0, Color::from_rgba(30, 15, 15, 240));
        
        for (i, enemy) in mock_enemies.iter().enumerate() {
            let y = 15.0 + i as f32 * 60.0;
            draw_text(&enemy.name, enemy_panel_x + padding, y + 14.0, 13.0, RED);
            
            let hp_bar_w = enemy_panel_w - padding * 2.0 - 10.0;
            let hp_percent = (enemy.hp / enemy.max_hp).clamp(0.0, 1.0);
            let hp_bar_y = y + 24.0;
            draw_rectangle(enemy_panel_x + padding, hp_bar_y, hp_bar_w, 14.0, Color::from_rgba(40, 15, 15, 255));
            draw_rectangle(enemy_panel_x + padding, hp_bar_y, hp_bar_w * hp_percent, 14.0, RED);
        }

        // ============================================================
        // BOTTOM MENU
        // ============================================================
        let menu_h = 220.0;
        let menu_y = screen_height - menu_h;
        
        draw_rectangle(0.0, menu_y, screen_width, menu_h, Color::from_rgba(12, 12, 18, 250));
        draw_line(0.0, menu_y, screen_width, menu_y, 3.0, GOLD);

        let status_text = if is_my_turn { "YOUR TURN" } else { "ENEMY TURN" };
        let status_color = if is_my_turn { GREEN } else { RED };
        draw_text(status_text, padding, menu_y + 22.0, 16.0, status_color);

        // Combat Log
        let log_x = padding;
        let log_y = menu_y + 32.0;
        let log_w = 350.0;
        let log_h = 75.0;
        draw_rectangle(log_x, log_y, log_w, log_h, Color::from_rgba(8, 8, 12, 220));
        for (i, log) in combat_logs.iter().rev().take(4).enumerate() {
            draw_text(log, log_x + 8.0, log_y + 16.0 + (i as f32 * 16.0), 12.0, GRAY);
        }

        let mouse = mouse_position();
        let was_click = is_mouse_button_pressed(MouseButton::Left);
        let buttons_start_x = log_x + log_w + 20.0;
        let buttons_start_y = menu_y + 35.0;

        match ui_state {
            BattleUIState::Main => {
                let actions = vec![("SKILLS", "⚔"), ("BAG", "🎒"), ("FLEE", "🏃"), ("STATS", "✨")];
                let btn_w = 160.0;
                let btn_h = 50.0;
                let gap = 12.0;

                for (i, (action, icon)) in actions.iter().enumerate() {
                    let x = buttons_start_x + (i % 2) as f32 * (btn_w + gap);
                    let y = buttons_start_y + (i / 2) as f32 * (btn_h + gap);
                    
                    let is_hovered = is_my_turn && mouse.0 >= x && mouse.0 <= x + btn_w && mouse.1 >= y && mouse.1 <= y + btn_h;
                    let bg_color = if is_hovered { Color::from_rgba(45, 45, 80, 255) } else { Color::from_rgba(30, 30, 45, 255) };

                    draw_rectangle(x, y, btn_w, btn_h, bg_color);
                    draw_rectangle_lines(x, y, btn_w, btn_h, 2.0, if is_hovered { GOLD } else { GRAY });
                    draw_text(icon, x + 12.0, y + 32.0, 20.0, WHITE);
                    draw_text(action, x + 38.0, y + 32.0, 20.0, WHITE);

                    if was_click && is_hovered {
                        match i {
                            0 => *ui_state = BattleUIState::AttackMenu,
                            1 => *ui_state = BattleUIState::BagMenu,
                            2 => { result_action = Some(HUDAction::Flee); },
                            3 => *ui_state = BattleUIState::PassiveInfo,
                            _ => {}
                        }
                    }
                }
            }

            BattleUIState::AttackMenu => {
                draw_text("SKILLS", buttons_start_x, menu_y + 25.0, 16.0, GOLD);
                
                let grid_cols = 4;
                let cell_w = 150.0;
                let cell_h = 45.0;

                for (i, atk) in character_class.skills.iter().enumerate() {
                    let x = buttons_start_x + (i % grid_cols) as f32 * (cell_w + 6.0);
                    let y = menu_y + 40.0 + (i / grid_cols) as f32 * (cell_h + 6.0);

                    let can_afford = game_state.resources.can_afford_mana(atk.mana_cost);
                    let is_hovered = is_my_turn && can_afford && mouse.0 >= x && mouse.0 <= x + cell_w && mouse.1 >= y && mouse.1 <= y + cell_h;
                    
                    let bg_color = if is_hovered { DARKGRAY } else { BLACK };
                    draw_rectangle(x, y, cell_w, cell_h, bg_color);
                    draw_rectangle_lines(x, y, cell_w, cell_h, 1.5, if is_hovered { GOLD } else { GRAY });
                    
                    draw_text(&atk.name, x + 6.0, y + 16.0, 13.0, if can_afford { WHITE } else { GRAY });
                    draw_text(&format!("MP:{} DMG:{}", atk.mana_cost, atk.base_damage), x + 6.0, y + 34.0, 10.0, SKYBLUE);

                    if was_click && is_hovered && is_my_turn {
                        result_action = Some(HUDAction::UseAttack(atk.name.clone()));
                    }
                }

                if draw_back_button(screen_width, menu_y, mouse, was_click) {
                    *ui_state = BattleUIState::Main;
                }
            }

            BattleUIState::BagMenu => {
                if draw_back_button(screen_width, menu_y, mouse, was_click) {
                    *ui_state = BattleUIState::Main;
                }
            }
            
            BattleUIState::Defeat => {
                draw_rectangle(0.0, 0.0, screen_width, screen_height, Color::from_rgba(0, 0, 0, 200));
                draw_text("DEFEAT", screen_width/2.0 - 100.0, screen_height/2.0, 60.0, RED);
                if was_click { result_action = Some(HUDAction::GiveUp); }
            }
            
            BattleUIState::PassiveInfo => {
                draw_text("STATS & PASSIVES", buttons_start_x, menu_y + 25.0, 16.0, GOLD);
                draw_text(&format!("HP: {} | MP: {} | SPD: {}", character_class.hp, character_class.mana, character_class.speed), buttons_start_x, menu_y + 50.0, 14.0, WHITE);
                
                if draw_back_button(screen_width, menu_y, mouse, was_click) {
                    *ui_state = BattleUIState::Main;
                }
            }
        }
        result_action
    }
}

fn draw_back_button(screen_width: f32, menu_y: f32, mouse: (f32, f32), clicked: bool) -> bool {
    let btn_w = 80.0;
    let btn_h = 30.0;
    let x = screen_width - btn_w - 12.0;
    let y = menu_y + 10.0;

    let is_hovered = mouse.0 >= x && mouse.0 <= x + btn_w && mouse.1 >= y && mouse.1 <= y + btn_h;
    let bg = if is_hovered { GRAY } else { DARKGRAY };

    draw_rectangle(x, y, btn_w, btn_h, bg);
    draw_text("BACK", x + 20.0, y + 20.0, 14.0, WHITE);
    clicked && is_hovered
}
