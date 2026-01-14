use serde::{Deserialize, Serialize};
use reqwest::blocking::Client;

const API_BASE_URL: &str = "http://localhost:3000/api/lobby/multiplayer";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MultiplayerLobby {
    #[serde(default)] // ID généré par le serveur
    pub id: String,
    pub hostUsername: String,
    pub name: String,
    pub ip: String,
    pub port: u16,
    pub maxPlayers: u32,
    pub currentPlayers: u32,
    pub isPrivate: bool,
    pub password: Option<String>,
    pub mapName: String,
}

pub fn fetch_server_list() -> Vec<MultiplayerLobby> {
    println!("Fetching server list from {}...", API_BASE_URL);
    let client = Client::new();
    let res = client.get(format!("{}/list", API_BASE_URL)).send();

    match res {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<Vec<MultiplayerLobby>>() {
                    Ok(list) => {
                        println!("Found {} servers.", list.len());
                        list
                    },
                    Err(e) => {
                        println!("❌ Error parsing server list: {}", e);
                        Vec::new()
                    }
                }
            } else {
                println!("❌ Backend returned status: {}", response.status());
                Vec::new()
            }
        },
        Err(e) => {
            println!("❌ Network connection error: {}", e);
            Vec::new()
        }
    }
}

pub fn announce_server(name: &str, username: &str, max_players: u32, is_private: bool, password: Option<String>) -> Option<String> {
    let client = Client::new();
    
    // Pour l'instant on hardcode l'IP locale pour le dev
    // Dans le futur, il faudra détecter l'IP LAN ou Publique
    let lobby = MultiplayerLobby {
        id: "".to_string(), // Server will generate
        hostUsername: username.to_string(),
        name: name.to_string(),
        ip: "127.0.0.1".to_string(), // A changer pour multi-PC
        port: 8080, // Port du jeu (pas encore utilisé vraiment)
        maxPlayers: max_players,
        currentPlayers: 1,
        isPrivate,
        password,
        mapName: "TheNexus".to_string(),
    };

    println!("Announcing server: {}", name);
    let res = client.post(format!("{}/announce", API_BASE_URL))
        .json(&lobby)
        .send();

    match res {
        Ok(response) => {
            if response.status().is_success() {
                // Le serveur retourne { id: "...", ... }
                // On pourrait parser pour choper l'ID
                println!("✅ Server announced successfully!");
                Some("registered".to_string()) 
            } else {
                println!("❌ Failed to announce server: {}", response.status());
                None
            }
        },
        Err(e) => {
            println!("❌ Network error announcing server: {}", e);
            None
        }
    }
}
