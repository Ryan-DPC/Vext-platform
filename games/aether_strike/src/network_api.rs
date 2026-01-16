use serde::{Deserialize, Serialize};
use reqwest::blocking::Client;
use std::net::UdpSocket;

/// Helper to get the base URL (Hardcoded for Dedicated Game Server)
pub fn get_base_url() -> String {
    "https://vext-game-server-1mgy.onrender.com".to_string()
}

/// URL for REST API (listing/announcing)
pub fn get_api_url() -> String {
    let base = get_base_url();
    // Le serveur Rust semble avoir un /health, on va supposer qu'il gère aussi le listing sur /api
    // Si la liste est gérée par le backend central, on remettra yj77 plus tard.
    // Mais pour l'instant, synchronisons sur le serveur de jeu.
    format!("{}/api/lobby/multiplayer", base)
}

/// URL for WebSocket (real-time game)
pub fn get_ws_url() -> String {
    let base = get_base_url();
    let ws_protocol = if base.starts_with("https") { "wss" } else { "ws" };
    let clean_base = base.replace("https://", "").replace("http://", "");
    // Le serveur Axum spécifie .route("/ws", ...)
    format!("{}://{}/ws", ws_protocol, clean_base)
}

// Auto-detect local IP (LAN)
pub fn get_local_ip() -> String {
    match UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => {
            if socket.connect("8.8.8.8:80").is_ok() {
                if let Ok(addr) = socket.local_addr() {
                    let ip = addr.ip().to_string();
                    println!("🌐 Detected local IP: {}", ip);
                    return ip;
                }
            }
        }
        Err(e) => {
            println!("⚠️ Failed to detect IP: {}", e);
        }
    }
    "127.0.0.1".to_string()
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MultiplayerLobby {
    #[serde(default)]
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
    // Si le serveur de jeu Rust ne gère pas le listing, les parties créées dessus 
    // n'apparaîtront pas. Dans ce cas, il faudrait utiliser le backend central.
    // Pour l'instant on garde la cohérence.
    let api_url = "https://vext-backend-yj77.onrender.com/api/lobby/multiplayer"; 
    let client = Client::new();
    println!("📡 Fetching server list from: {}/list", api_url);
    let res = client.get(format!("{}/list", api_url)).send();

    match res {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<Vec<MultiplayerLobby>>() {
                    Ok(list) => {
                        println!("✅ Fetched {} servers", list.len());
                        list
                    },
                    Err(e) => {
                        println!("❌ Failed to parse server list: {}", e);
                        Vec::new()
                    }
                }
            } else {
                println!("❌ Fetch server list failed: Status {}", response.status());
                Vec::new()
            }
        },
        Err(e) => {
            println!("❌ Fetch server list error: {}", e);
            Vec::new()
        }
    }
}

pub fn announce_server(name: &str, username: &str, max_players: u32, is_private: bool, password: Option<String>) -> Option<String> {
    let client = Client::new();
    let local_ip = get_local_ip();
    
    let lobby = MultiplayerLobby {
        id: "".to_string(),
        hostUsername: username.to_string(),
        name: name.to_string(),
        ip: local_ip,
        port: 8080,
        maxPlayers: max_players,
        currentPlayers: 1,
        isPrivate: is_private,
        password,
        mapName: "TheNexus".to_string(),
    };

    // L'annonce doit se faire sur le backend central pour que tout le monde la voie
    let api_url = "https://vext-backend-yj77.onrender.com/api/lobby/multiplayer";
    println!("📡 Announcing server to: {}/announce", api_url);
    let res = client.post(format!("{}/announce", api_url))
        .json(&lobby)
        .send();

    match res {
        Ok(response) => {
            if response.status().is_success() {
                println!("✅ HTTP Announce success");
                Some("registered".to_string()) 
            } else {
                println!("❌ HTTP Announce failed: Status {}", response.status());
                None
            }
        },
        Err(e) => {
             println!("❌ HTTP Announce error: {}", e);
             None
        }
    }
}
