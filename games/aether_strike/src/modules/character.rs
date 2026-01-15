use macroquad::prelude::*;
use crate::entities::StickFigure;
use crate::class_system::CharacterClass;

pub fn create_local(
    name: &str,
    class: &CharacterClass,
    position: Vec2
) -> StickFigure {
    let mut new_player = StickFigure::new(position, name.to_string());
    new_player.max_health = class.hp;
    new_player.health = new_player.max_health;
    new_player.color = class.color();
    // new_player.damage = class.str... (if implemented)
    new_player
}
