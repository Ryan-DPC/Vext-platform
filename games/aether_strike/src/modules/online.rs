use crate::network_client::{GameEvent, RemotePlayer};
use std::collections::HashMap;
use crate::modules::position::*;

// Returns a log message
pub fn handle_player_joined(
    username: &str,
    player_id: &str, 
    class: &str,
    hp: f32,
    max_hp: f32,
    speed: f32,
    local_username: &str,
    other_players: &mut HashMap<String, RemotePlayer>
) -> String {
    let id_short = if player_id.len() >= 4 { &player_id[..4] } else { player_id };
    let msg = format!("{} joined! ({})", username, id_short);
    
    if username != local_username {
        let display_class = class.to_string();
        // Assign next available slot (naive)
        // Note: Logic copied from main.rs. Ideally we use better slot logic.
        let slot_idx = (other_players.len() % 3) + 1;
        let pos = PLAYER_POSITIONS[slot_idx];
        
        other_players.insert(player_id.to_string(), RemotePlayer {
            userId: player_id.to_string(),
            username: username.to_string(),
            class: display_class,
            hp,
            max_hp,
            speed,
            position: (pos.x, pos.y),
        });
    }
    msg
}

pub fn handle_player_left(player_id: &str, other_players: &mut HashMap<String, RemotePlayer>) -> String {
    other_players.remove(player_id);
    let id_short = if player_id.len() >= 6 { &player_id[..6] } else { player_id };
    format!("Player {} left", id_short)
}

// Logic for GameState sync event
pub fn sync_game_state(
    players: Vec<crate::network_client::RemotePlayer>,
    local_username: &str,
    other_players: &mut HashMap<String, RemotePlayer>,
    all_classes: &[crate::class_system::CharacterClass]
) -> (String, Option<crate::class_system::CharacterClass>) {
    let mut selected_class_update = None;
    let msg = format!("Sync ({} players)", players.len());
    
    other_players.clear();
    for mut p in players {
        if p.username != local_username {
             let slot_idx = (other_players.len() % 3) + 1;
             let pos = PLAYER_POSITIONS[slot_idx];
             p.position = (pos.x, pos.y);
             other_players.insert(p.userId.clone(), p);
        } else {
             if let Some(cls) = all_classes.iter().find(|c| c.name.eq_ignore_ascii_case(&p.class)) {
                 selected_class_update = Some(cls.clone());
             }
        }
    }
    (msg, selected_class_update)
}
