use macroquad::prelude::*;
use crate::game::GameState;

pub struct HUD;

impl HUD {
    pub fn draw(game_state: &GameState, screen_width: f32, screen_height: f32, character_name: &str, player_class: &str) {
        // --- CONSTANTS ---
        let bar_width = 300.0;
        let bar_height = 25.0;
        let padding = 20.0;
        let skill_size = 50.0;
        let skill_gap = 10.0;

        // --- TOP LEFT: PLAYER INFO ---
        let top_ui_h = 90.0;
        
        // Background gradient-ish fan 
        draw_rectangle(0.0, 0.0, 400.0, top_ui_h, Color::from_rgba(0, 0, 0, 160));
        draw_rectangle(0.0, top_ui_h, 380.0, 5.0, Color::from_rgba(0, 0, 0, 100)); // fade edge

        // Avatar Frame (Mockup)
        let avatar_size = 60.0;
        draw_rectangle(padding, padding, avatar_size, avatar_size, DARKGRAY);
        draw_rectangle_lines(padding, padding, avatar_size, avatar_size, 2.0, LIGHTGRAY);
        // First Letter as Avatar
        let initial = character_name.chars().next().unwrap_or('?').to_string();
        draw_text(&initial, padding + 18.0, padding + 42.0, 40.0, WHITE);

        // Name & Class
        let text_x = padding + avatar_size + 15.0;
        draw_text(character_name, text_x, padding + 22.0, 24.0, WHITE);
        draw_text(&format!("Lv.1 {}", player_class.to_uppercase()), text_x, padding + 45.0, 16.0, GOLD);

        // Health Bar (Red)
        let hp_percent = game_state.resources.current_hp / game_state.resources.max_hp;
        let bar_x = text_x;
        let bar_y = padding + 55.0;
        
        // Background
        draw_rectangle(bar_x, bar_y, 200.0, 12.0, Color::from_rgba(50, 0, 0, 255));
        // Fill
        draw_rectangle(bar_x, bar_y, 200.0 * hp_percent.clamp(0.0, 1.0), 12.0, RED);
        // Border
        draw_rectangle_lines(bar_x, bar_y, 200.0, 12.0, 1.0, BLACK);
        
        // Text HP
        let hp_text = format!("{:.0}/{:.0}", game_state.resources.current_hp, game_state.resources.max_hp);
        draw_text(&hp_text, bar_x + 80.0, bar_y + 10.0, 10.0, WHITE);

        // --- TOP RIGHT: GAME STATS (Wave, Gold) ---
        let stats_w = 250.0;
        let stats_x = screen_width - stats_w;
        draw_rectangle(stats_x, 0.0, stats_w, 60.0, Color::from_rgba(0, 0, 0, 160));
        
        // Wave
        draw_text(&format!("WAVE {}", game_state.current_wave), stats_x + 20.0, 35.0, 30.0, WHITE);
        
        // Gold
        let gold_text = format!("{} G", game_state.resources.gold);
        draw_text(&gold_text, screen_width - 100.0, 35.0, 24.0, GOLD);

        // --- BOTTOM CENTER: ACTION BAR (Text-based RPG Menu) ---
        // "ATTAQUE", "SAC", "FUITE", "PASSIF"
        let actions = vec!["ATTAQUE", "SAC", "FUITE", "PASSIF"];
        let btn_width = 120.0;
        let btn_height = 50.0;
        let gap = 15.0;
        
        // Calculate total width to center it
        let total_w = actions.len() as f32 * btn_width + (actions.len() - 1) as f32 * gap;
        let start_x = (screen_width - total_w) / 2.0;
        let start_y = screen_height - btn_height - 30.0;

        for (i, action) in actions.iter().enumerate() {
            let req_x = start_x + i as f32 * (btn_width + gap);
            
            // Check hover (mockup logic as this is just draw code, main loop handles clicks ideally)
            // But we can visualize it
            let mouse = mouse_position();
            let is_hovered = mouse.0 >= req_x && mouse.0 <= req_x + btn_width &&
                             mouse.1 >= start_y && mouse.1 <= start_y + btn_height;
            
            let bg_color = if is_hovered { Color::from_rgba(80, 80, 150, 255) } else { Color::from_rgba(40, 40, 60, 230) };
            let border_color = if is_hovered { WHITE } else { LIGHTGRAY };
            
            // Draw Button
            draw_rectangle(req_x, start_y, btn_width, btn_height, bg_color);
            draw_rectangle_lines(req_x, start_y, btn_width, btn_height, 2.0, border_color);
            
            // Center text
            let text_dims = measure_text(action, None, 20, 1.0);
            draw_text(
                action, 
                req_x + (btn_width - text_dims.width) / 2.0, 
                start_y + (btn_height - text_dims.height) / 2.0 + text_dims.offset_y, 
                20.0, 
                WHITE
            );
        }

        // --- BOTTOM LEFT: CHAT/LOG ---
        draw_rectangle(10.0, screen_height - 150.0, 300.0, 140.0, Color::from_rgba(0, 0, 0, 120));
        draw_text("Combat Log", 20.0, screen_height - 130.0, 16.0, WHITE);
        draw_line(20.0, screen_height - 125.0, 300.0, screen_height - 125.0, 1.0, WHITE);
        
        // Mock logs
        draw_text("> Game started", 20.0, screen_height - 100.0, 14.0, LIGHTGRAY);
        draw_text("> Player joined", 20.0, screen_height - 80.0, 14.0, GREEN);
    }
}
