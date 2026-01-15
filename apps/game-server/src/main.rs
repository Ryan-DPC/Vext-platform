use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};
use tokio::sync::broadcast;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    rooms: Arc<RwLock<HashMap<String, Room>>>,
}

struct Room {
    tx: broadcast::Sender<String>, // Broadcast channel for the room
    players: HashMap<String, Player>, // userId -> Player state
    host_id: String,
    state: String, // "waiting", "playing"
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Player {
    username: String,
    class: String,
    position: (f32, f32),
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "game_server=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = AppState {
        rooms: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/ws", get(ws_handler))
        .with_state(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("🚀 Aether Strike Dedicated Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();

    // User session state
    let mut user_id = String::new();
    let mut username = String::new();
    let mut current_room_id = String::new();
    let mut rx_room: Option<broadcast::Receiver<String>> = None;

    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(parsed) = serde_json::from_str::<Value>(&text) {
                let msg_type = parsed["type"].as_str().unwrap_or("");
                let data = &parsed["data"];

                match msg_type {
                    "auth" => {
                        // In a real dedicated server, verify JWT. 
                        // For now we accept the claim to be stateless/fast.
                         if let Some(token) = data["token"].as_str() {
                            // Decode JWT logic here if needed (omitted for brevity)
                            // We expect client to send userId/username in handshake or auth payload for this MVP
                            // Or we decode the token. 
                            // Simplification: Assume Client sends userId/username in auth data for this prototype
                            // user_id = ...
                         }
                         // Actually, the current client sends token in QUERY param which Axum can extract.
                         // But if upgraded, connection is established.
                         // Let's assume the client sends an 'auth' message first?
                         // Current Client logic: Connects with ?token=...
                         // We skipped query param extraction in handler for simplicity.
                         // Let's rely on receiving an ID from the client messages for now or TODO: Extract info.
                         tracing::info!("Auth requested (Logic pending)");
                    }

                    "aether-strike:create-game" => {
                        let game_id = data["gameId"].as_str().unwrap_or("default").to_string();
                        user_id = "Host".to_string(); // Placeholder if auth missing
                        // In real impl, grab from Auth.
                        
                        // Let's try to grab ID from data if present for testing
                        if let Some(id) = data["userId"].as_str() { user_id = id.to_string(); }
                        
                        let (tx, _rx) = broadcast::channel(100);
                        
                        let mut rooms = state.rooms.write().unwrap();
                        rooms.insert(game_id.clone(), Room {
                            tx: tx.clone(),
                            players: HashMap::new(),
                            host_id: user_id.clone(),
                            state: "waiting".to_string(),
                        });
                        
                        // Subscribe
                        current_room_id = game_id.clone();
                        rx_room = Some(tx.subscribe());
                        
                        // Send success
                        let _ = sender.send(Message::Text(serde_json::json!({
                            "type": "aether-strike:game-created",
                            "data": { "gameId": game_id, "hostId": user_id }
                        }).to_string())).await;
                        
                        tracing::info!("Game Created: {}", game_id);
                    }

                    "aether-strike:join-game" => {
                        let game_id = data["gameId"].as_str().unwrap_or("").to_string();
                        // user_id needs to be set. 
                        // FIX: Assuming for now we get it from an unsecure auth flow or we need to extract token.
                        // Ideally we upgrade with Token.
                        
                        let mut rooms = state.rooms.write().unwrap();
                        if let Some(room) = rooms.get_mut(&game_id) {
                            // Subscribe
                            rx_room = Some(room.tx.subscribe());
                            current_room_id = game_id.clone();
                            
                             // Send state
                            let _ = sender.send(Message::Text(serde_json::json!({
                                "type": "aether-strike:game-state",
                                "data": { 
                                    "players": [], // TODO: Serialize players
                                    "state": room.state,
                                    "hostId": room.host_id
                                }
                            }).to_string())).await;
                            
                            tracing::info!("Player joined: {}", game_id);
                        }
                    }

                    // Relay Logic
                    _ => {
                        // Generic Relay for other messages
                        if !current_room_id.is_empty() {
                            let rooms = state.rooms.read().unwrap();
                            if let Some(room) = rooms.get(&current_room_id) {
                                // Broadcast using format
                                let _ = room.tx.send(text.clone());
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Cleanup on disconnect
    if !current_room_id.is_empty() {
         let mut rooms = state.rooms.write().unwrap();
         if let Some(room) = rooms.get_mut(&current_room_id) {
             room.players.remove(&user_id);
             // Broadcast leave?
         }
    }
}
