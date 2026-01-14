use macroquad::prelude::*;

pub struct GameAssets {
    pub sprite_sheet: Texture2D,
}

impl GameAssets {
    pub async fn load() -> Self {
        let sprite_sheet = load_texture("assets/characters.png").await.unwrap();
        sprite_sheet.set_filter(FilterMode::Nearest); // Pixel art look

        Self {
            sprite_sheet,
        }
    }

    /// Returns the source rect for a given class and animation frame
    /// Class indices: 0=Archer, 1=Enemy, 2=Mage, 3=Warrior
    /// Frame indices: 0..5
    pub fn get_sprite_rect(&self, class_idx: u32, frame_idx: u32) -> Rect {
        let rows = 4.0;
        let cols = 6.0;
        
        let sprite_width = self.sprite_sheet.width() / cols;
        let sprite_height = self.sprite_sheet.height() / rows;

        Rect::new(
            frame_idx as f32 * sprite_width,
            class_idx as f32 * sprite_height,
            sprite_width,
            sprite_height,
        )
    }

    pub fn get_archer_rect(&self, frame_idx: u32) -> Rect { self.get_sprite_rect(0, frame_idx) }
    pub fn get_enemy_rect(&self, frame_idx: u32) -> Rect { self.get_sprite_rect(1, frame_idx) }
    pub fn get_mage_rect(&self, frame_idx: u32) -> Rect { self.get_sprite_rect(2, frame_idx) }
    pub fn get_warrior_rect(&self, frame_idx: u32) -> Rect { self.get_sprite_rect(3, frame_idx) }
}
