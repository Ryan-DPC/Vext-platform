use macroquad::prelude::*;

/// États du jeu
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GameScreen {
    MainMenu,
    PlayMenu,           // Solo / Online
    CharacterCreation,  // Choix de classe
    SessionList,        // Liste des sessions (Online)
    CreateServer,       // Créer un serveur
    Lobby,              // Salle d'attente (NOUVEAU)
    InGame,
    Options,
}

/// Données du joueur
#[derive(Debug, Clone)]
pub struct PlayerProfile {
    pub vext_username: String,  // Pseudo du launcher VEXT
    pub character_name: String,
    pub friends: Vec<Friend>,
    pub gold: u32,
}

impl PlayerProfile {
    pub fn new(vext_username: String) -> Self {
        PlayerProfile {
            vext_username,
            character_name: String::new(),
            friends: vec![],
            gold: 500, // Starter gold
        }
    }

    pub fn add_friend(&mut self, name: &str, online: bool) {
        self.friends.push(Friend::new(name, online));
    }
}

/// Ami dans la liste
#[derive(Debug, Clone)]
pub struct Friend {
    pub name: String,
    pub online: bool,
}

impl Friend {
    pub fn new(name: &str, online: bool) -> Self {
        Friend {
            name: name.to_string(),
            online,
        }
    }
}

/// Session de jeu online
#[derive(Debug, Clone)]
pub struct GameSession {
    pub name: String,
    pub host: String,
    pub current_players: u32,
    pub max_players: u32,
    pub average_level: u32,
    pub ping: u32,
    pub is_private: bool,
    pub password: Option<String>,  // Si privé
    pub map: String,
}

impl GameSession {
    pub fn new(name: &str, host: &str, max_players: u32, is_private: bool, password: Option<String>) -> Self {
        GameSession {
            name: name.to_string(),
            host: host.to_string(),
            current_players: 1,
            max_players,
            average_level: 1,
            ping: 0,
            is_private,
            password,
            map: "TheNexus".to_string(),
        }
    }
}
