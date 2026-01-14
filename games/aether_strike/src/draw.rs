use macroquad::prelude::*;
use std::collections::HashMap;
use crate::assets::GameAssets;
use crate::class_system::CharacterClass;
use crate::menu_ui::*;
use crate::network_client::RemotePlayer;
use crate::entities::{StickFigure, Enemy};

        pub struct DrawCommand<'a> {
            pub y: f32, // For sorting
            pub texture: &'a Texture2D,
            pub source: Rect,
            pub dest: Rect,
            pub color: Color,
            pub flip_x: bool,
            pub name: Option<String>,
            pub name_color: Color,
            pub text_y: f32, // NEW: Absolute Y position for text
            pub text_center_x: Option<f32>, // Optional absolute X center for text (overrides dest center)
        }

pub struct Renderer<'a> {
    pub assets: &'a GameAssets,
    pub all_classes: &'a [CharacterClass],
}

impl<'a> Renderer<'a> {
    pub fn new(assets: &'a GameAssets, all_classes: &'a [CharacterClass]) -> Self {
        Self { assets, all_classes }
    }

    pub fn draw_main_menu(&self, profile: &PlayerProfile, buttons: &[MenuButton], mouse_pos: Vec2) {
        clear_background(Color::from_rgba(10, 10, 20, 255));
        draw_text("AETHER STRIKE", SCREEN_WIDTH / 2.0 - 200.0, 150.0, 60.0, GOLD);
        draw_text("VEXT Edition", SCREEN_WIDTH / 2.0 - 80.0, 200.0, 24.0, WHITE);
        
        draw_text(&format!("Player: {}", profile.vext_username), 20.0, 30.0, 20.0, LIGHTGRAY);
        
        for btn in buttons {
            let is_hovered = btn.is_clicked(mouse_pos);
            btn.draw(is_hovered);
        }
    }

    pub fn draw_play_menu(&self, buttons: &[MenuButton], mouse_pos: Vec2) {
        clear_background(Color::from_rgba(15, 10, 25, 255));
        draw_text("SELECT MODE", SCREEN_WIDTH / 2.0 - 140.0, 150.0, 40.0, WHITE);
        
        for btn in buttons {
            let is_hovered = btn.is_clicked(mouse_pos);
            btn.draw(is_hovered);
        }
        draw_text("Press ESC to go back", 20.0, SCREEN_HEIGHT - 20.0, 20.0, LIGHTGRAY);
    }

    pub fn draw_class_selection(&self, buttons: &[ClassButton], mouse_pos: Vec2, player_name: &str, selected_class_name: Option<&str>) {
        clear_background(Color::from_rgba(20, 15, 30, 255));
        draw_text("CHARACTER CREATION", 50.0, 60.0, 45.0, WHITE);
        
        draw_text("NAME:", 50.0, 140.0, 30.0, GOLD);
        draw_text(player_name, 170.0, 140.0, 30.0, WHITE);
        
        draw_text("SELECT YOUR CLASS:", 50.0, 220.0, 30.0, GOLD);
        
        for btn in buttons {
            let is_hovered = btn.is_clicked(mouse_pos);
            let is_selected = selected_class_name == Some(&btn.class_name);
            btn.draw_with_selection(is_hovered, is_selected);
        }
    }

    pub fn draw_session_list(&self, sessions: &[SessionButton], profile: &PlayerProfile, mouse_pos: Vec2) {
        clear_background(Color::from_rgba(10, 10, 30, 255));
        draw_text("AVAILABLE SESSIONS", 40.0, 60.0, 40.0, WHITE);
        
        draw_text(&format!("Logged in as: {}", profile.vext_username), 40.0, 100.0, 20.0, GREEN);
        
        if sessions.is_empty() {
            draw_text("No sessions found. Create one or Refresh!", 40.0, 200.0, 24.0, GRAY);
        } else {
            for btn in sessions {
                let is_hovered = btn.is_clicked(mouse_pos);
                btn.draw(is_hovered);
            }
        }
    }

    pub fn draw_lobby(&self, session_name: &str, player_count: usize, profile: &PlayerProfile, other_players: &HashMap<String, RemotePlayer>) {
        clear_background(Color::from_rgba(30, 30, 50, 255));
        draw_text(&format!("LOBBY: {}", session_name), 50.0, 50.0, 40.0, WHITE);
        
        // Players Box
        draw_rectangle(50.0, 100.0, 400.0, 500.0, Color::from_rgba(20, 20, 40, 255));
        draw_rectangle_lines(50.0, 100.0, 400.0, 500.0, 2.0, LIGHTGRAY);
        
        draw_text(&format!("PLAYERS ({}/4)", player_count), 70.0, 140.0, 30.0, GOLD);
        draw_text(&format!("1. {} (You)", profile.vext_username), 70.0, 190.0, 24.0, GREEN);
        
        let mut y = 230.0;
        let mut i = 2;
        for player in other_players.values() {
            draw_text(&format!("{}. {} [{}]", i, player.username, player.class), 70.0, y, 24.0, WHITE);
            y += 40.0;
            i += 1;
        }
    }

    pub fn draw_environment(&self) {
        clear_background(Color::from_rgba(20, 20, 30, 255));
        for x in 0..((SCREEN_WIDTH / 50.0) as i32 + 1) {
            for y in 0..((SCREEN_HEIGHT / 50.0) as i32 + 1) {
                 let color = if (x + y) % 2 == 0 {
                     Color::from_rgba(30, 30, 45, 255)
                 } else {
                     Color::from_rgba(35, 35, 50, 255)
                 };
                 draw_rectangle(x as f32 * 50.0, y as f32 * 50.0, 50.0, 50.0, color);
            }
        }
        draw_rectangle(0.0, 500.0, SCREEN_WIDTH, 20.0, Color::from_rgba(50, 40, 30, 255));
    }

    pub fn draw_game_scene(
        &self,
        player: Option<&StickFigure>,
        teammates: &[StickFigure],
        other_players: &HashMap<String, RemotePlayer>,
        enemies: &[Enemy],
        boss: Option<&Enemy>,
        player_class_name: &str,
    ) {
        let mut commands = Vec::new();

        // 1. Collect Teammates
        for (i, teammate) in teammates.iter().enumerate() {
            let class_name = match i {
                1 => "Mage",
                2 => "Archer",
                _ => "Warrior",
            };
            self.push_entity_command(&mut commands, teammate.position, class_name, &teammate.name, WHITE, false);
        }

        // 2. Collect Player
        if let Some(p) = player {
            self.push_entity_command(&mut commands, p.position, player_class_name, "YOU", GOLD, false);
        }

        // 3. Collect Other Players
        for op in other_players.values() {
            self.push_entity_command(&mut commands, vec2(op.position.0, op.position.1), &op.class, &op.username, WHITE, false);
        }

        // 4. Collect Enemies
        for enemy in enemies {
            let rect = self.assets.get_enemy_rect(0);
            let base_size = 140.0;
            commands.push(DrawCommand {
                y: enemy.position.y,
                texture: &self.assets.sprite_sheet,
                source: rect,
                dest: Rect::new(enemy.position.x - base_size / 2.0, enemy.position.y - base_size / 2.0, base_size, base_size),
                color: WHITE,
                flip_x: true,
                name: None,
                name_color: WHITE,
                text_y: enemy.position.y - 90.0,
                text_center_x: None,
            });
        }

        // 5. Collect Boss
        if let Some(enemy) = boss {
            let rect = self.assets.get_enemy_rect(0);
            let base_size = 180.0;
            commands.push(DrawCommand {
                y: enemy.position.y,
                texture: &self.assets.sprite_sheet,
                source: rect,
                dest: Rect::new(enemy.position.x - base_size / 2.0, enemy.position.y - base_size / 2.0, base_size, base_size),
                color: WHITE,
                flip_x: true,
                name: Some("BOSS".to_string()),
                name_color: RED,
                text_y: enemy.position.y - 120.0,
                text_center_x: None,
            });
        }

        // --- SORT BY Y ---
        commands.sort_by(|a, b| a.y.partial_cmp(&b.y).unwrap_or(std::cmp::Ordering::Equal));

        // --- DRAW ALL ---
        for cmd in commands {
            draw_texture_ex(
                cmd.texture,
                cmd.dest.x,
                cmd.dest.y,
                cmd.color,
                DrawTextureParams {
                    source: Some(cmd.source),
                    dest_size: Some(vec2(cmd.dest.w, cmd.dest.h)),
                    flip_x: cmd.flip_x,
                    ..Default::default()
                },
            );

            if let Some(name) = cmd.name {
                let font_size = if name == "BOSS" { 30.0 } else { 18.0 };
                let text_dims = measure_text(&name, None, font_size as u16, 1.0);
                
                let center_x = cmd.text_center_x.unwrap_or(cmd.dest.x + cmd.dest.w / 2.0);
                
                draw_text(
                    &name, 
                    center_x - text_dims.width / 2.0, 
                    cmd.text_y, 
                    font_size, 
                    cmd.name_color
                );
            }
        }
    }

    fn push_entity_command(
        &self,
        commands: &mut Vec<DrawCommand<'a>>,
        pos: Vec2,
        class_name: &str,
        name: &str,
        name_color: Color,
        _flip_x: bool,
    ) {
        let tex = self.assets.get_class_texture(class_name);
        let rect = self.assets.get_sprite_rect(class_name, 0);

        let (scale, ox, oy) = self.all_classes.iter()
            .find(|c| c.name == class_name)
            .map(|c| (c.visual_scale, c.visual_offset_x, c.visual_offset_y))
            .unwrap_or((1.0, 0.0, 0.0));
        
        let base_height = 140.0 * scale;
        let aspect_ratio = rect.w / rect.h;
        let dest_w = base_height * aspect_ratio;
        let dest_h = base_height;

        let top_padding = self.assets.get_top_padding(class_name);
        let center_ratio = self.assets.get_center_x_ratio(class_name);
        
        let visible_top_y = pos.y - dest_h / 2.0 + oy + (dest_h * top_padding);
        let visible_center_x = pos.x - dest_w / 2.0 + ox + (dest_w * center_ratio);
        
        commands.push(DrawCommand {
            y: pos.y,
            texture: tex,
            source: rect,
            dest: Rect::new(pos.x - dest_w / 2.0 + ox, pos.y - dest_h / 2.0 + oy, dest_w, dest_h),
            color: WHITE,
            flip_x: false,
            name: Some(name.to_string()),
            name_color,
            text_y: visible_top_y - 5.0, // Reduced gap to 5px
            text_center_x: Some(visible_center_x),
        });
        
        // Use text_y (already calculated) but we need to pass center_x for drawing?
        // DrawCommand stores `dest`. The draw loop calculates text X from `dest`.
        // We need to store the `visible_center_x` in DrawCommand or adjust `dest`?
        // No, `dest` is used for the sprite. We can reuse `dest.x` + offset?
        // If we change `dest`, sprite moves.
        // We can add `text_x` to DrawCommand? Or better, `text_center_x`.
    }
}

pub const SCREEN_WIDTH: f32 = 1024.0;
pub const SCREEN_HEIGHT: f32 = 768.0;
