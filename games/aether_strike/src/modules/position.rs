use macroquad::prelude::*;

pub const SCREEN_WIDTH: f32 = 1024.0;
pub const SCREEN_HEIGHT: f32 = 768.0;

// Position des combattants (vue de côté)
pub const PLAYER_X: f32 = 400.0; // Default Local Player Position
pub const PLAYER_Y: f32 = 320.0;
pub const ENEMY_X: f32 = 700.0;
pub const ENEMY_Y: f32 = 320.0;

// Visual Slots for 4 Players (Slot 0 is always Local Player)
pub const PLAYER_POSITIONS: [Vec2; 4] = [
    vec2(400.0, 320.0), // Slot 0: Local Player (Front Center-ish)
    vec2(280.0, 200.0), // Slot 1: Top Back
    vec2(150.0, 360.0), // Slot 2: Mid Back
    vec2(280.0, 460.0), // Slot 3: Bot Back
];
