use crate::network_api;
use crate::menu_ui::*;
use crate::draw::SCREEN_WIDTH;

pub fn refresh_sessions() -> Vec<SessionButton> {
    let lobbies = network_api::fetch_server_list();
    lobbies.into_iter().enumerate().map(|(i, lobby)| {
        SessionButton::new(
            GameSession {
                name: lobby.name,
                host: lobby.hostUsername,
                current_players: lobby.currentPlayers,
                max_players: lobby.maxPlayers,
                average_level: 1,
                ping: 0,
                is_private: lobby.isPrivate,
                password: lobby.password,
                map: lobby.mapName,
            },
            20.0,
            140.0 + i as f32 * 70.0,
            SCREEN_WIDTH - 360.0,
            60.0,
        )
    }).collect()
}

pub fn create_session(name: &str, username: &str, is_private: bool, password: &str, max_players: u32) -> bool {
    network_api::announce_server(name, username, max_players, is_private, if password.is_empty() { None } else { Some(password.to_string()) }).is_some()
}
