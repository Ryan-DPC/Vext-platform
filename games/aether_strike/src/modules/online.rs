use crate::network_client::{GameEvent, RemotePlayer};
use std::collections::HashMap;
use crate::modules::position::*;

// Returns a log message
pub fn handle_player_joined(
    username: &str,
    player_id: &str, 
    class: &str,
    local_username: &str,
    other_players: &mut HashMap<String, RemotePlayer>
) -> String {
    let msg = format!("{} joined! ({})", username, &player_id[..4]);
    
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
            position: (pos.x, pos.y),
        });
    }
    msg
}

pub fn handle_player_left(player_id: &str, other_players: &mut HashMap<String, RemotePlayer>) -> String {
    other_players.remove(player_id);
    format!("Player {} left", &player_id[..6])
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
