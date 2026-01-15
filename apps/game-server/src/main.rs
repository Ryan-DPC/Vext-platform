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

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr_str = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr_str).await.unwrap();
    tracing::info!("🚀 Aether Strike Dedicated Server listening on {}", addr_str);
    
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    tracing::info!("WS Connection requested");
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();

    // User session state
    let mut user_id = String::new();
    let _username = String::new(); // Placeholder
    let mut current_room_id = String::new();
    let mut rx_room: Option<broadcast::Receiver<String>> = None;

    loop {
        tokio::select! {
            // 1. Handle incoming messages from Client
            val = receiver.next() => {
                match val {
                    Some(Ok(msg)) => {
                        if let Message::Text(text) = msg {
                           if let Ok(parsed) = serde_json::from_str::<Value>(&text) {
                                let msg_type = parsed["type"].as_str().unwrap_or("");
                                let data = &parsed["data"];
                                
                                match msg_type {
                                    "auth" => {
                                         if let Some(_token) = data["token"].as_str() {
                                            tracing::info!("Auth requested (Logic pending)");
                                         }
                                    }
                                    "aether-strike:create-game" => {
                                        let game_id = data["gameId"].as_str().unwrap_or("default").to_string();
                                        user_id = data["userId"].as_str().unwrap_or("Host").to_string();
                                        
                                        let (tx, _rx) = broadcast::channel(100);
                                        
                                        {
                                            let mut rooms = state.rooms.write().unwrap();
                                            rooms.insert(game_id.clone(), Room {
                                                tx: tx.clone(),
                                                players: HashMap::new(),
                                                host_id: user_id.clone(),
                                                state: "waiting".to_string(),
                                            });
                                        } // DROP LOCK HERE
                                        
                                        current_room_id = game_id.clone();
                                        rx_room = Some(tx.subscribe());
                                        
                                        let response = serde_json::json!({
                                            "type": "aether-strike:game-created",
                                            "data": { "gameId": game_id, "hostId": user_id }
                                        }).to_string();
                                        let _ = sender.send(Message::Text(response)).await;
                                        
                                        tracing::info!("Game Created: {}", game_id);
                                    }
                                    "aether-strike:join-game" => {
                                        let game_id = data["gameId"].as_str().unwrap_or("").to_string();
                                        // TODO: Grab userId from auth or payload
                                        
                                        let (room_tx, room_state, room_host) = {
                                            let mut rooms = state.rooms.write().unwrap();
                                            if let Some(room) = rooms.get_mut(&game_id) {
                                                (Some(room.tx.clone()), Some(room.state.clone()), Some(room.host_id.clone()))
                                            } else {
                                                (None, None, None)
                                            }
                                        }; // DROP LOCK
                                        
                                        if let Some(tx) = room_tx {
                                            current_room_id = game_id.clone();
                                            rx_room = Some(tx.subscribe());
                                            
                                            let response = serde_json::json!({
                                                "type": "aether-strike:game-state",
                                                "data": { 
                                                    "players": [], 
                                                    "state": room_state.unwrap_or_default(),
                                                    "hostId": room_host.unwrap_or_default()
                                                }
                                            }).to_string();
                                            let _ = sender.send(Message::Text(response)).await;

                                            // BROADCAST to others
                                            let join_msg = serde_json::json!({
                                                "type": "aether-strike:player-joined",
                                                "data": {
                                                    "playerId": "69674e69b08773d5cab6a58b", // TODO: Use real ID
                                                    "username": "Player", // TODO: Use real username
                                                    "class": "warrior"
                                                }
                                            }).to_string();
                                            // Ideally we relay the Original Message? 
                                            // The original message was "join-game".
                                            // We need to construct "player-joined".
                                            // We don't have the full player info in "data" (client sends class/etc?).
                                            // Client sends: { gameId, playerClass, maxPlayers }.
                                            // We need to extract playerClass.
                                            
                                            // Let's assume we extract it higher up or just reuse 'text' if we can?
                                            // No, 'text' is 'join-game'. Clients expect 'player-joined'.
                                            
                                            let player_class = data["playerClass"].as_str().unwrap_or("warrior").to_string();
                                            let p_id = "Guest"; // FIXME matches Handshake 
                                            // If we use UserID from Auth, we put it here.
                                            
                                            // Fixing Broadcast:
                                            let broadcast_msg = serde_json::json!({
                                                "type": "aether-strike:player-joined",
                                                "data": {
                                                    "playerId": user_id, // Variable from outer scope
                                                    "username": "Unknown", // user_id is set? check scope
                                                    "class": player_class
                                                }
                                            }).to_string();
                                            let _ = tx.send(broadcast_msg);
                                            
                                            tracing::info!("Player joined: {}", game_id);
                                        }
                                    }
                                    _ => {
                                        // Relay Logic
                                        if !current_room_id.is_empty() {
                                            let tx = {
                                                let rooms = state.rooms.read().unwrap();
                                                rooms.get(&current_room_id).map(|r| r.tx.clone())
                                            }; // DROP LOCK
                                            
                                            if let Some(tx) = tx {
                                                // Avoid echoing back to sender? 
                                                // Ideally strictly relay. But if we broadcast, we receive it in our RX loop too?
                                                // Usually we want to echo to others.
                                                // broadcast::channel sends to ALL receivers.
                                                let _ = tx.send(text);
                                            }
                                        }
                                    }
                                }
                           }
                        }
                    }
                    Some(Err(_)) | None => break, // Disconnect
                }
            }
            
            // 2. Handle outgoing messages from Room (Broadcast)
            recv_result = async {
                if let Some(rx) = &mut rx_room {
                    rx.recv().await
                } else {
                    // If no room, wait forever (pending) so we don't busy loop
                    std::future::pending::<Result<String, broadcast::error::RecvError>>().await
                }
            } => {
                match recv_result {
                    Ok(msg) => {
                         // Relay to our WebSocket
                         let _ = sender.send(Message::Text(msg)).await;
                    }
                    Err(_e) => {
                        // Lagged or closed
                    }
                }
            }
        }
    }
    
    // Cleanup
    if !current_room_id.is_empty() {
         let mut rooms = state.rooms.write().unwrap();
         if let Some(room) = rooms.get_mut(&current_room_id) {
             room.players.remove(&user_id);
         }
    }
}
