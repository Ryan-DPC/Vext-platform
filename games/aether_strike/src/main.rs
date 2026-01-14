#![allow(dead_code)]
use macroquad::prelude::*;
use crate::input::handle_text_input;
use crate::ui::hud::HUD;
use std::collections::HashMap;

mod game;
mod entities;
mod systems;
mod ui;
mod class_system;
mod inventory;
mod menu_system;
mod menu_ui;
mod assets;
mod network_api;
mod network_client;
mod launcher;
mod input;
mod draw;
mod server;
mod backend;

use game::GameState;
use entities::{StickFigure, Enemy};
use menu_system::{GameScreen, PlayerProfile, MenuButton, ClassButton, GameSession, SessionButton};
use class_system::CharacterClass;
use menu_ui::{draw_create_server, draw_password_dialog};
use assets::GameAssets;
use network_client::{GameClient, GameEvent};

const SCREEN_WIDTH: f32 = 1024.0;
const SCREEN_HEIGHT: f32 = 768.0;

// Position des combattants (vue de côté)
const PLAYER_X: f32 = 200.0;
const PLAYER_Y: f32 = 450.0;
const ENEMY_X: f32 = 700.0;
const ENEMY_Y: f32 = 450.0;

fn window_conf() -> Conf {
    Conf {
        window_title: "Aether Strike - Dev Build".to_owned(),
        window_width: SCREEN_WIDTH as i32,
        window_height: SCREEN_HEIGHT as i32,
        window_resizable: false,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    // ==== CHARGEMENT DES CLASSES DYNAMIQUE ====
    println!("📚 Loading character classes...");
    let all_classes = crate::class_system::CharacterClass::load_all();
    println!("✅ Loaded {} classes!", all_classes.len());

    // Charger les assets (besoin des classes pour les textures spécifiques)
    println!("🎨 Loading assets...");
    let assets = GameAssets::load(&all_classes).await;
    println!("✅ Assets loaded!");

    // Gestion des arguments de lancement (VEXT Integration)
    let (launcher_config, mut player_profile) = launcher::parse_launch_args();
    let vext_username = launcher_config.username;
    let _vext_token = launcher_config.token;
    let vext_token = _vext_token.clone();

    // Extraire le nom de personnage (username sans discriminant)
    let character_name_input = vext_username
        .split('#')
        .next()
        .unwrap_or(&vext_username)
        .to_string();

    // Fallback if no friends passed (optional, or just leave empty)
    // player_profile.add_friend("MaxGamer42", true);
    
    let mut selected_class: Option<CharacterClass> = None;
    
    // Variables pour le online
    let mut server_name_input = String::new();
    let mut server_password_input = String::new();
    let mut is_private_server = false;
    let mut max_players = 4u32;
    let mut server_name_active = false;
    let mut server_password_active = false;
    
    // Sessions mock (normalement viendraient du serveur)
    // Sessions mock (normalement viendraient du serveur - vide maintenant)
    let mut sessions: Vec<SessionButton> = Vec::new();
    
    // Network manager (Refactored)
    let mut network_manager = server::NetworkManager::new();
    
    // Renderer (Refactored)
    let renderer = draw::Renderer::new(&assets, &all_classes);
    let mut other_players: HashMap<String, network_client::RemotePlayer> = HashMap::new();
    let mut is_host = false;
    let mut _lobby_host_id = String::new();
    let vext_token = _vext_token.clone(); // Garde le token pour l'auth WebSocket
    
    // Dialogue de mot de passe
    let mut show_password_dialog = false;
    let mut join_password_input = String::new();
    let join_password_active = true;
    let mut selected_session: Option<usize> = None;
    
    // Variables pour le jeu
    let mut current_screen = GameScreen::MainMenu;
    let mut _game_state: Option<GameState> = None;
    let mut _player: Option<StickFigure> = None;
    let mut _teammates: Vec<StickFigure> = Vec::new();
    let mut _enemy: Option<Enemy> = None;
    let mut _enemies: Vec<Enemy> = Vec::new();
    let mut last_network_log = String::from("Ready");
    let mut battle_ui_state = crate::ui::hud::BattleUIState::Main;
    let mut current_turn_id = String::new();
    let mut enemy_hp = 500.0;
    let enemy_max_hp = 500.0;
    let mut combat_logs: Vec<String> = Vec::new();
    
    // Solo combat state
    let mut is_solo_mode = false;
    let mut is_player_turn = true;
    let mut enemy_attack_timer = 0.0;
    let _last_enemy_action_time = 0.0;

    // ==== MENU PRINCIPAL ====
    let main_menu_buttons = vec![
        MenuButton::new("JOUER", SCREEN_WIDTH / 2.0 - 150.0, 300.0, 300.0, 70.0),
        MenuButton::new("BOUTIQUE", SCREEN_WIDTH / 2.0 - 150.0, 390.0, 300.0, 70.0),
        MenuButton::new("OPTIONS", SCREEN_WIDTH / 2.0 - 150.0, 480.0, 300.0, 70.0),
        MenuButton::new("QUITTER", SCREEN_WIDTH / 2.0 - 150.0, 570.0, 300.0, 70.0),
    ];

    // ==== MENU JOUER ====
    let play_menu_buttons = vec![
        MenuButton::new("SOLO", SCREEN_WIDTH / 2.0 - 200.0, 250.0, 400.0, 80.0),
        MenuButton::new("ONLINE", SCREEN_WIDTH / 2.0 - 200.0, 350.0, 400.0, 80.0),
    ];


    let mut class_buttons = Vec::new();
    for (idx, cls) in all_classes.iter().enumerate() {
        let cols = 5;
        let x = 22.0 + (idx % cols) as f32 * 200.0;
        let y = 280.0 + (idx / cols) as f32 * 105.0;
        
        class_buttons.push(ClassButton::new(
            &cls.name,
            &cls.role,
            x, y, 190.0, 95.0,
            cls.color(),
        ));
    }

    // Boutons
    let confirm_button = MenuButton::new("START GAME", SCREEN_WIDTH / 2.0 - 150.0, SCREEN_HEIGHT - 80.0, 300.0, 60.0);
    let create_server_button = MenuButton::new("CREATE SERVER", SCREEN_WIDTH - 350.0, SCREEN_HEIGHT - 70.0, 200.0, 50.0);
    let confirm_create_button = MenuButton::new("CREATE", SCREEN_WIDTH / 2.0 - 100.0, SCREEN_HEIGHT - 100.0, 200.0, 50.0);
    let refresh_button = MenuButton::new("REFRESH", SCREEN_WIDTH - 170.0, 40.0, 150.0, 40.0);

    loop {
        let mouse_pos = vec2(mouse_position().0, mouse_position().1);

        // ==== GESTION DES INPUTS ====
        match current_screen {
            GameScreen::MainMenu => {
                renderer.draw_main_menu(&player_profile, &main_menu_buttons, mouse_pos);

                if is_mouse_button_pressed(MouseButton::Left) {
                    if main_menu_buttons[0].is_clicked(mouse_pos) {
                        current_screen = GameScreen::PlayMenu;
                    } else if main_menu_buttons[1].is_clicked(mouse_pos) {
                        // SHOP Clicked - Placeholder
                        println!("Boutique clicked (Not implemented)");
                    } else if main_menu_buttons[2].is_clicked(mouse_pos) {
                        current_screen = GameScreen::Options;
                    } else if main_menu_buttons[3].is_clicked(mouse_pos) {
                        break;
                    }
                }
            }

            GameScreen::PlayMenu => {
                renderer.draw_play_menu(&play_menu_buttons, mouse_pos);

                if is_mouse_button_pressed(MouseButton::Left) {
                    if play_menu_buttons[0].is_clicked(mouse_pos) {
                        // Solo selected
                        current_screen = GameScreen::CharacterCreation;
                    } else if play_menu_buttons[1].is_clicked(mouse_pos) {
                        // Online
                        current_screen = GameScreen::SessionList;
                    }
                }

                if is_key_pressed(KeyCode::Escape) {
                    current_screen = GameScreen::MainMenu;
                }
            }

            GameScreen::CharacterCreation => {
                // Nom automatique depuis le username VEXT (sans discriminant)
                let player_name = character_name_input.as_str();
                let selected_class_name = selected_class.as_ref().map(|c| c.name.as_str());
                renderer.draw_class_selection(&class_buttons, mouse_pos, player_name, selected_class_name);

                // Sélection de classe
                if is_mouse_button_pressed(MouseButton::Left) {
                    for (idx, btn) in class_buttons.iter().enumerate() {
                        if btn.is_clicked(mouse_pos) {
                            selected_class = Some(all_classes[idx].clone());
                            break;
                        }
                    }

                    // Bouton START GAME (seulement si classe sélectionnée)
                    if confirm_button.is_clicked(mouse_pos) && selected_class.is_some() {
                        let player_class = selected_class.as_ref().unwrap();
                        player_profile.character_name = character_name_input.clone();
                        
                        _game_state = Some(GameState::new(player_class.clone()));
                        // Player Position (Front Left)
                        let mut new_player = StickFigure::new(vec2(250.0, 450.0), "You".to_string());
                        new_player.max_health = player_class.hp;
                        new_player.health = new_player.max_health;
                        new_player.color = player_class.color();
                        _player = Some(new_player);
                        
                        // Main Boss Position (Front Right)
                        _enemy = Some(Enemy::new(vec2(900.0, 420.0)));
                        
                        // Solo mode setup
                        is_solo_mode = true;
                        
                        // Reposition Player (Forward)
                        if let Some(p) = &mut _player {
                            p.position = vec2(400.0, 320.0); // Down & Back a bit
                        }
                        
                        // Create Mock Teammates (Adjusted based on feedback)
                        _teammates.clear();
                        // 1. DarkKnight (Top Back)
                        let mut t1 = StickFigure::new(vec2(280.0, 200.0), "DarkKnight".to_string());
                        t1.color = Color::from_rgba(200, 50, 50, 255); 
                        _teammates.push(t1);
                        // 2. Elara (Mage - Mid)
                        let mut t2 = StickFigure::new(vec2(150.0, 360.0), "Elara".to_string());
                        t2.color = Color::from_rgba(50, 100, 200, 255); 
                        _teammates.push(t2);
                        // 3. SwiftArrow (Bot)
                        let mut t3 = StickFigure::new(vec2(280.0, 460.0), "SwiftArrow".to_string()); 
                        t3.color = Color::from_rgba(50, 200, 100, 255); 
                        _teammates.push(t3);

                        // Create Mock Enemies (Closer)
                        // User: "Avance encore un poil" -> Move Left by 30px
                        
                        _enemies.clear();
                        // 1. Shadow Minion
                        _enemies.push(Enemy::new(vec2(790.0, 200.0))); // 820->790
                        // 2. Dark Spirit
                        _enemies.push(Enemy::new(vec2(890.0, 360.0))); // 920->890
                        // 3. Void Crawler
                        _enemies.push(Enemy::new(vec2(790.0, 460.0))); // 820->790
                        
                        is_player_turn = true;
                        enemy_hp = 500.0; 
                        
                        // Initialize boss
                        if let Some(e) = &mut _enemy {
                            e.position = vec2(670.0, 320.0); // 700->670
                            e.max_health = 500.0;
                            e.health = 500.0;
                            e.add_threat("teammate_0", 40.0); 
                            e.add_threat("player", 0.0);
                        }
                        combat_logs.clear();
                        combat_logs.push("Battle started!".to_string());
                        
                        current_screen = GameScreen::InGame;
                    }
                }

                // Dessiner le bouton START GAME si classe sélectionnée
                if let Some(_player_class) = &selected_class {
                    let is_hovered = confirm_button.is_clicked(mouse_pos);
                    confirm_button.draw(is_hovered);
                }

                if is_key_pressed(KeyCode::Escape) {
                    current_screen = GameScreen::PlayMenu;
                    selected_class = None;
                }
            }

            GameScreen::SessionList => {
                renderer.draw_session_list(&sessions, &player_profile, mouse_pos);

                if is_mouse_button_pressed(MouseButton::Left) {
                    // Vérifier les clics sur les boutons JOIN
                    for (i, session) in sessions.iter().enumerate() {
                        if session.join_button_clicked(mouse_pos) {
                            selected_session = Some(i);
                            
                            // Connecter au relay WebSocket
                            let lobby_id = session.session.name.clone(); // Utilise le nom comme ID pour l'instant
                            let ws_url = network_api::get_ws_url();
                            
                            match GameClient::connect(
                                &ws_url,
                                &vext_token,
                                lobby_id.clone(),
                                selected_class.as_ref().map(|c| c.name.to_lowercase()).unwrap_or_else(|| "warrior".to_string()),
                                false // is_host = false
                            ) {
                                Ok(client) => {
                                    network_manager.client = Some(client);
                                    is_host = false;
                                    println!("✅ Connected to relay server!");
                                    println!("✅ Joined lobby: {}", lobby_id);
                                    current_screen = GameScreen::Lobby;
                                }
                                Err(e) => {
                                    eprintln!("❌ Failed to connect to relay: {}", e);
                                    // On peut quand même aller au lobby en mode "offline"
                                    current_screen = GameScreen::Lobby;
                                }
                            }
                            break;
                        }
                    }

                    // Bouton CREATE SERVER
                    if create_server_button.is_clicked(mouse_pos) {
                        current_screen = GameScreen::CreateServer;
                        server_name_input.clear();
                        server_password_input.clear();
                        is_private_server = false;
                        max_players = 4;
                    }

                    // Bouton REFRESH
                    if refresh_button.is_clicked(mouse_pos) {
                        sessions = backend::refresh_sessions();
                    }
                }

                let is_hovered = refresh_button.is_clicked(mouse_pos);
                refresh_button.draw(is_hovered);

                // Dessiner le bouton CREATE SERVER
                let is_hovered = create_server_button.is_clicked(mouse_pos);
                create_server_button.draw(is_hovered);

                if is_key_pressed(KeyCode::Escape) {
                    current_screen = GameScreen::PlayMenu;
                }
            }

            GameScreen::CreateServer => {
                draw_create_server(
                    &server_name_input,
                    is_private_server,
                    &server_password_input,
                    max_players,
                    server_name_active,
                    server_password_active,
                    mouse_pos,
                );

                if is_mouse_button_pressed(MouseButton::Left) {
                    // Input server name
                    let name_rect = Rect::new(100.0, 160.0, 600.0, 50.0);
                    server_name_active = name_rect.contains(mouse_pos);

                    // Checkbox private
                    let checkbox_rect = Rect::new(300.0, 210.0, 30.0, 30.0);
                    if checkbox_rect.contains(mouse_pos) {
                        is_private_server = !is_private_server;
                        if !is_private_server {
                            server_password_input.clear();
                        }
                    }

                    // Input password
                    if is_private_server {
                        let password_rect = Rect::new(100.0, 300.0, 600.0, 50.0);
                        server_password_active = password_rect.contains(mouse_pos);
                    } else {
                        server_password_active = false;
                    }

                    // Bouton CREATE
                    if confirm_create_button.is_clicked(mouse_pos) && !server_name_input.is_empty() {
                        // Announce to Backend (METADATA)
                        network_api::announce_server(
                            &server_name_input, 
                            &player_profile.vext_username,
                            max_players,
                            is_private_server,
                            if is_private_server && !server_password_input.is_empty() { Some(server_password_input.clone()) } else { None }
                        );

                        // Connect to Relay (WS)
                        let lobby_id = server_name_input.clone();
                        let ws_url = network_api::get_ws_url();
                        
                        match GameClient::connect(
                            &ws_url,
                            &vext_token,
                            lobby_id.clone(),
                            selected_class.as_ref().map(|c| c.name.clone()).unwrap_or_else(|| "warrior".to_string()).to_lowercase(),
                            true // is_host = true
                        ) {
                            Ok(client) => {
                                network_manager.client = Some(client);
                                is_host = true;
                                println!("✅ Server created and connected to relay: {}", lobby_id);
                            }
                            Err(e) => {
                                eprintln!("❌ Failed to connect relay: {}", e);
                            }
                        }

                        // Créer le serveur localement pour la liste
                        let new_session = GameSession::new(
                            &server_name_input,
                            &player_profile.vext_username,
                            max_players,
                            is_private_server,
                            if is_private_server && !server_password_input.is_empty() {
                                Some(server_password_input.clone())
                            } else {
                                None
                            },
                        );
                        
                        let y_pos = 140.0 + sessions.len() as f32 * 70.0;
                        sessions.push(SessionButton::new(
                            new_session,
                            20.0,
                            y_pos,
                            SCREEN_WIDTH - 360.0,
                            60.0,
                        ));

                        selected_session = Some(sessions.len() - 1);
                        current_screen = GameScreen::Lobby;
                    }
                }

                // Input clavier
                if server_name_active {
                    handle_text_input(&mut server_name_input, 30);
                } else if server_password_active {
                    handle_text_input(&mut server_password_input, 20);
                }

                // Dessiner bouton CREATE
                let is_hovered = confirm_create_button.is_clicked(mouse_pos);
                confirm_create_button.draw(is_hovered);

                if is_key_pressed(KeyCode::Escape) {
                    current_screen = GameScreen::SessionList;
                }
            }


            GameScreen::Lobby => {
                clear_background(Color::from_rgba(30, 30, 50, 255));
                
                let session_name = if let Some(idx) = selected_session {
                    &sessions[idx].session.name
                } else {
                    "Lobby"
                };

                draw_text(&format!("LOBBY: {}", session_name), 50.0, 50.0, 40.0, WHITE);

                // ===== RELAY MULTIPLAYER: Poll for updates =====
                if let Some(client) = &network_manager.client {
                    let events: Vec<GameEvent> = client.poll_updates();
                    for event in events {
                        match event {
                            GameEvent::GameState { players, host_id } => {
                                let msg = format!("Sync ({} players)", players.len());
                                println!("📋 {}", msg);
                                last_network_log = msg;
                                other_players.clear();
                                for p in players {
                                    if p.username != player_profile.vext_username {
                                        other_players.insert(p.userId.clone(), p);
                                    } else {
                                        // Sync our own local selected_class with server record
                                        if let Some(cls) = all_classes.iter().find(|c| c.name.eq_ignore_ascii_case(&p.class)) {
                                            selected_class = Some(cls.clone());
                                        }
                                    }
                                }
                                _lobby_host_id = host_id;
                            }
                            GameEvent::PlayerJoined { player_id, username, class } => {
                                let msg = format!("{} joined! ({})", username, &player_id[..4]);
                                println!("👋 {}", msg);
                                last_network_log = msg;
                                if username != player_profile.vext_username {
                                    let display_class = class.clone();
                                    other_players.insert(player_id.clone(), network_client::RemotePlayer {
                                        userId: player_id,
                                        username: username,
                                        class: display_class,
                                        position: (400.0, 300.0),
                                    });
                                }
                            }
                            GameEvent::PlayerLeft { player_id } => {
                                let msg = format!("Player {} left", &player_id[..6]);
                                println!("👋 {}", msg);
                                last_network_log = msg;
                                other_players.remove(&player_id);
                            }
                            GameEvent::PlayerUpdated { player_id, class } => {
                                let display_class = class.clone();
                                let msg = format!("Update: {} -> {}", &player_id[..4], display_class);
                                println!("✏️ {}", msg);
                                last_network_log = msg;
                                // If it's another player, update them
                                if let Some(player) = other_players.get_mut(&player_id) {
                                    player.class = display_class;
                                }
                            }
                            GameEvent::GameStarted => {
                                // ... existing GameStarted logic ...
                                let msg = "Game start received! Launching...".to_string();
                                println!("🚀 {}", msg);
                                last_network_log = msg;
                                
                                // --- INITIALIZE GAME STATE FOR MULTIPLAYER ---
                                let p_class = selected_class.clone().unwrap_or_else(|| all_classes[0].clone());
                                selected_class = Some(p_class.clone());
                                
                                _game_state = Some(GameState::new(p_class.clone()));
                                
                                let mut new_player = StickFigure::new(vec2(PLAYER_X, PLAYER_Y), "You".to_string());
                                new_player.max_health = _game_state.as_ref().unwrap().get_max_hp();
                                new_player.health = new_player.max_health;
                                new_player.color = p_class.color();
                                _player = Some(new_player);
                                
                                _enemy = Some(Enemy::new(vec2(ENEMY_X, ENEMY_Y)));
                                // ---------------------------------------------

                                current_screen = GameScreen::InGame;
                            }
                            // ... existing cases ...
                            GameEvent::NewHost { host_id } => {
                                let msg = format!("New host: {}", host_id);
                                println!("👑 {}", msg);
                                last_network_log = msg;
                                _lobby_host_id = host_id;
                            }
                            GameEvent::Error(e) => {
                                last_network_log = format!("Error: {}", e);
                                println!("❌ {}", last_network_log);
                            }
                            GameEvent::PlayerUpdate(update) => {
                                if let Some(pos) = update.position {
                                    if let Some(player) = other_players.get_mut(&update.player_id) {
                                        player.position = pos;
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }

                renderer.draw_lobby(session_name, 1 + other_players.len(), &player_profile, &other_players);
 
                 // --- CLASS SELECTION UI (Grid restricted for space or scrollable) ---
                 draw_text("CHOOSE CLASS:", 500.0, 100.0, 30.0, WHITE);
                 
                 for (idx, cls) in all_classes.iter().enumerate() {
                     let btn_x = 500.0 + (idx / 10) as f32 * 170.0; // Two columns if many classes
                     let btn_y = 140.0 + (idx % 10) as f32 * 45.0;
                     let btn_w = 160.0;
                     let btn_h = 40.0;
                     
                     let is_selected = selected_class.as_ref().map(|c| &c.name == &cls.name).unwrap_or(false);
                     let color = if is_selected { cls.color() } else { DARKGRAY };
                     
                     let is_hovered = mouse_pos.x >= btn_x && mouse_pos.x <= btn_x + btn_w && mouse_pos.y >= btn_y && mouse_pos.y <= btn_y + btn_h;
                     
                     if is_hovered {
                         draw_rectangle(btn_x - 2.0, btn_y - 2.0, btn_w + 4.0, btn_h + 4.0, WHITE);
                     }
                     draw_rectangle(btn_x, btn_y, btn_w, btn_h, color);
                     draw_text(&cls.name, btn_x + 10.0, btn_y + 28.0, 18.0, WHITE);
                     
                     if is_mouse_button_pressed(MouseButton::Left) && is_hovered {
                         selected_class = Some(cls.clone());
                         // Send update to server
                         if let Some(client) = &network_manager.client {
                             println!("📤 Sending class change: {}", cls.name.to_lowercase());
                             client.send_class_change(cls.name.to_lowercase());
                         }
                     }
                 }

                // Start Button (Host Only)
                if is_host {
                    // ... existing start button logic ...
                    let start_btn_rect = Rect::new(SCREEN_WIDTH - 350.0, SCREEN_HEIGHT - 150.0, 300.0, 80.0);
                    let is_hovered = start_btn_rect.contains(mouse_pos);
                    let btn_color = if is_hovered { GREEN } else { DARKGREEN };
                    
                    draw_rectangle(start_btn_rect.x, start_btn_rect.y, start_btn_rect.w, start_btn_rect.h, btn_color);
                    draw_text("START GAME", start_btn_rect.x + 30.0, start_btn_rect.y + 50.0, 40.0, WHITE);
                    
                    if is_mouse_button_pressed(MouseButton::Left) && is_hovered {
                         if let Some(client) = &network_manager.client {
                             client.start_game();
                         }
                         // Initialize our own state immediately as well or wait for event?
                         // Wait for event to be safe and consistent with clients
                         // current_screen = GameScreen::InGame; 
                    }
                } else {
                    draw_text("WAITING FOR HOST TO START...", SCREEN_WIDTH - 450.0, SCREEN_HEIGHT - 100.0, 24.0, LIGHTGRAY);
                }
                
                // ... debug log ...

                // Debug Network Log
                draw_text(&format!("Last Event: {}", last_network_log), 50.0, SCREEN_HEIGHT - 30.0, 20.0, YELLOW);

                if is_key_pressed(KeyCode::Escape) {
                    current_screen = GameScreen::SessionList;
                    // Disconnect relay
                    if let Some(client) = &network_manager.client {
                        client.disconnect();
                    }
                    network_manager.client = None;
                    other_players.clear();
                    last_network_log = "Disconnected".to_string();
                }
            }

            GameScreen::InGame => {
                clear_background(Color::from_rgba(20, 20, 30, 255));
                
                // --- DRAW ENVIRONMENT (Aesthetics) ---
                // Simple tiled floor
                for x in 0..((SCREEN_WIDTH / 50.0) as i32 + 1) {
                    for y in 0..((SCREEN_HEIGHT / 50.0) as i32 + 1) {
                         let color = if (x + y) % 2 == 0 {
                             Color::from_rgba(30, 30, 45, 255)
                         } else {
                             Color::from_rgba(35, 35, 50, 255)
                         };
                         draw_rectangle(x as f32 * 50.0, y as f32 * 50.0, 50.0, 50.0, color);
                    }
                }
                
                // Draw a "Ground" line for reference
                draw_rectangle(0.0, 500.0, SCREEN_WIDTH, 20.0, Color::from_rgba(50, 40, 30, 255));

                // ===== RELAY MULTIPLAYER: Poll for updates in-game =====
                if let Some(client) = &network_manager.client {
                    let events: Vec<GameEvent> = client.poll_updates();
                    for event in events {
                        match event {
                            GameEvent::PlayerUpdate(update) => {
                                if let Some(player) = other_players.get_mut(&update.player_id) {
                                    if let Some(pos) = update.position {
                                        player.position = pos;
                                    }
                                }
                            }
                            GameEvent::PlayerUpdated { player_id, class } => {
                                if let Some(player) = other_players.get_mut(&player_id) {
                                    player.class = class;
                                }
                            }
                            GameEvent::GameState { players, .. } => {
                                // Full sync in game too
                                other_players.clear();
                                for mut p in players {
                                    if p.username != player_profile.vext_username {
                                    if let Some(cls) = all_classes.iter().find(|c| c.name.eq_ignore_ascii_case(&p.class)) {
                                        p.class = cls.name.clone();
                                    }
                                        other_players.insert(p.userId.clone(), p);
                                    }
                                }
                            }
                            GameEvent::PlayerLeft { player_id } => {
                                other_players.remove(&player_id);
                            }
                            GameEvent::TurnChanged { current_turn_id: next_id } => {
                                current_turn_id = next_id;
                                combat_logs.push(format!("Turn: {}", if current_turn_id == "enemy" { "ENEMY" } else { &current_turn_id[..4] }));
                            }
                            GameEvent::CombatAction { actor_id, target_id, action_name, damage, mana_cost, is_area: _ } => {
                                let actor_name = if actor_id == "enemy" { "ENEMY" } else { 
                                    if actor_id == player_profile.vext_username { "YOU" } else { &actor_id[..4] }
                                };
                                combat_logs.push(format!("{} used {} ({} dmg)", actor_name, action_name, damage));
                                
                                // Update HP based on target
                                if let Some(tid) = target_id {
                                    if tid == "enemy" {
                                        enemy_hp = (enemy_hp - damage).max(0.0);
                                    } else if tid == player_profile.vext_username {
                                        if let Some(gs) = &mut _game_state {
                                            gs.resources.current_hp = (gs.resources.current_hp - damage).max(0.0);
                                        }
                                    }
                                } else if actor_id == "enemy" {
                                    // Enemy area attack? (Simple: hit player)
                                    if let Some(gs) = &mut _game_state {
                                        gs.resources.current_hp = (gs.resources.current_hp - damage).max(0.0);
                                    }
                                }

                                // Update Mana if it's us
                                if actor_id == player_profile.vext_username {
                                    if let Some(gs) = &mut _game_state {
                                        gs.resources.mana = gs.resources.mana.saturating_sub(mana_cost);
                                    }
                                }
                            }
                            _ => {}
                        }
                    }

                    // Envoyer notre position (mock movement for now)
                    if let Some(player) = &_player {
                        client.send_input((player.position.x, player.position.y), (0.0, 0.0), "idle".to_string());
                    }
                }
                
                // Dessiner les entités (Y-Sorted)
                let player_class_name = if let Some(gs) = &_game_state {
                    gs.character_class.name.as_str()
                } else {
                    "Warrior"
                };

                renderer.draw_game_scene(
                    _player.as_ref(),
                    &_teammates,
                    &other_players,
                    &_enemies,
                    _enemy.as_ref(),
                    player_class_name,
                );






                

                // --- DRAW HUD ---
                if let Some(gs) = &mut _game_state {
                    let _current_class = &gs.character_class;
                    
                    // Determine if it's player's turn
                    let is_my_turn = if is_solo_mode {
                        is_player_turn
                    } else {
                        current_turn_id == player_profile.vext_username
                    };
                    
                    let e_hp_percent = enemy_hp / enemy_max_hp;

                    if let Some(action) = HUD::draw(
                        gs, 
                        SCREEN_WIDTH, 
                        SCREEN_HEIGHT, 
                        &character_name_input,
                        &gs.character_class,
                        &other_players,
                        e_hp_percent,
                        is_my_turn,
                        &mut battle_ui_state,
                        &combat_logs,
                    ) {
                        // Handle actions
                        if is_solo_mode {
                            // Solo mode: process locally
                            match action {
                                crate::ui::hud::HUDAction::UseAttack(name) => {
                                    // Find attack damage
                                    if let Some(atk) = gs.character_class.skills.iter().find(|s| s.name == name) {
                                        if gs.resources.can_afford_mana(atk.mana_cost) {
                                            // Spend mana
                                            gs.resources.mana = gs.resources.mana.saturating_sub(atk.mana_cost);
                                            
                                            // Deal damage to enemy
                                            let damage = atk.base_damage;
                                            enemy_hp = (enemy_hp - damage).max(0.0);
                                            
                                            // Update Aggro
                                            if let Some(e) = &mut _enemy {
                                                e.health = enemy_hp;
                                                e.add_threat("player", damage);
                                            }
                                            
                                            combat_logs.push(format!("You used {} for {:.0} damage!", name, damage));
                                            
                                            // Switch to enemy turn
                                            is_player_turn = false;
                                            enemy_attack_timer = get_time() + 1.5; // Enemy attacks after 1.5s
                                            battle_ui_state = crate::ui::hud::BattleUIState::Main;
                                        }
                                    }
                                }
                                crate::ui::hud::HUDAction::UseItem(item_type) => {
                                    // Use item from inventory (decrements quantity)
                                    if gs.inventory.use_item(item_type) {
                                        match item_type {
                                            crate::inventory::ItemType::HealthPotion => {
                                                // +50 HP
                                                gs.resources.current_hp = (gs.resources.current_hp + 50.0).min(gs.resources.max_hp);
                                                if let Some(p) = &mut _player {
                                                    p.health = gs.resources.current_hp;
                                                }
                                            }
                                            crate::inventory::ItemType::ManaPotion => {
                                                // +30 MP
                                                gs.resources.restore_mana(30);
                                            }
                                            crate::inventory::ItemType::FullRestore => {
                                                // Full HP/MP
                                                gs.resources.current_hp = gs.resources.max_hp;
                                                gs.resources.mana = gs.resources.max_mana;
                                                if let Some(p) = &mut _player {
                                                    p.health = gs.resources.max_hp;
                                                }
                                            }
                                        }
                                        
                                        combat_logs.push(format!("Used {}!", item_type.name()));
                                        
                                        // End Turn
                                        is_player_turn = false;
                                        enemy_attack_timer = get_time() + 1.5;
                                        battle_ui_state = crate::ui::hud::BattleUIState::Main;
                                    }
                                }
                                crate::ui::hud::HUDAction::Flee => {
                                    combat_logs.push("You fled from battle!".to_string());
                                    current_screen = GameScreen::MainMenu;
                                    is_solo_mode = false;
                                }
                                    crate::ui::hud::HUDAction::EndTurn => {
                                        is_player_turn = false;
                                        enemy_attack_timer = get_time() + 1.0;
                                    }
                                    crate::ui::hud::HUDAction::Resurrect => {
                                        if gs.inventory.use_item(crate::inventory::ItemType::FullRestore) {
                                            gs.resources.current_hp = gs.resources.max_hp;
                                            gs.resources.mana = gs.resources.max_mana;
                                            if let Some(p) = &mut _player {
                                                p.health = gs.resources.max_hp;
                                            }
                                            battle_ui_state = crate::ui::hud::BattleUIState::Main;
                                            combat_logs.push("Resurrected!".to_string());
                                        }
                                    }
                                    crate::ui::hud::HUDAction::GiveUp => {
                                        // Lose 25% of TOTAL gold
                                        let lost_gold = (gs.resources.gold as f32 * 0.25) as u32;
                                        gs.resources.gold = gs.resources.gold.saturating_sub(lost_gold);
                                        
                                        println!("Defeat! Lost {} gold.", lost_gold);
                                        current_screen = GameScreen::PlayMenu; // Or MainMenu? PlayMenu is safer to see updated stats
                                        is_solo_mode = false;
                                    }
                                }
                        } else {
                            // Multiplayer mode: send to server
                            if let Some(client) = &network_manager.client {
                                match action {
                                    crate::ui::hud::HUDAction::UseAttack(name) => {
                                        client.use_attack(name, Some("enemy".to_string()));
                                    }
                                    crate::ui::hud::HUDAction::Flee => {
                                        client.flee();
                                    }
                                    crate::ui::hud::HUDAction::EndTurn => {
                                        client.end_turn();
                                    }
                                    crate::ui::hud::HUDAction::UseItem(_) => {
                                        println!("Item usage not yet supported in Multiplayer");
                                    }
                                    _ => {
                                        println!("Action not supported in Multiplayer");
                                    }
                                }
                            }
                        }
                    }
                    
                    // === SOLO MODE: ENEMY AI ===
                    if is_solo_mode && !is_player_turn && get_time() > enemy_attack_timer {
                        // Enemy attacks player
                        let enemy_attacks = vec![
                            ("Slash", 25.0),
                            ("Heavy Strike", 40.0),
                            ("Dark Pulse", 35.0),
                        ];
                        
                        // Random attack
                        let attack_idx = (get_time() * 1000.0) as usize % enemy_attacks.len();
                        let (attack_name, base_damage) = enemy_attacks[attack_idx];
                        
                        // Apply damage to player
                        let damage = base_damage;
                        gs.resources.current_hp = (gs.resources.current_hp - damage).max(0.0);
                        
                        combat_logs.push(format!("Enemy used {} for {:.0} damage!", attack_name, damage));
                        
                        // Check if player died
                        if gs.resources.current_hp <= 0.0 {
                            gs.resources.current_hp = 0.0;
                            battle_ui_state = crate::ui::hud::BattleUIState::Defeat;
                            combat_logs.push("You have been defeated!".to_string());
                        }

                        
                        // Check if enemy died
                        if enemy_hp <= 0.0 {
                            combat_logs.push("Victory! Enemy defeated!".to_string());
                            gs.resources.gold += 100;
                        }
                        
                        // Switch back to player turn
                        is_player_turn = true;
                    }
                }

                // Combat log is now drawn inside HUD::draw()

                if is_key_pressed(KeyCode::Escape) {
                    current_screen = GameScreen::MainMenu;
                    is_solo_mode = false;
                    // Properly disconnect from server
                    if let Some(client) = &network_manager.client {
                        client.disconnect();
                    }
                    network_manager.client = None;
                    other_players.clear();
                    last_network_log = "Left Game".to_string();
                }
            }
                
            GameScreen::Options => {
                clear_background(Color::from_rgba(20, 20, 40, 255));
                draw_text("OPTIONS", 100.0, 100.0, 40.0, GOLD);
                draw_text("Coming soon...", 100.0, 150.0, 24.0, WHITE);
                draw_text("Press ESC to go back", 20.0, SCREEN_HEIGHT - 20.0, 20.0, LIGHTGRAY);

                if is_key_pressed(KeyCode::Escape) {
                    current_screen = GameScreen::MainMenu;
                }
            }
        }

        // Dialogue de mot de passe par-dessus tout
        if show_password_dialog {
            draw_password_dialog(&join_password_input, join_password_active);

            if join_password_active {
                handle_text_input(&mut join_password_input, 20);
            }

            if is_key_pressed(KeyCode::Enter) {
                // Vérifier le mot de passe
                if let Some(session_idx) = selected_session {
                    if let Some(ref password) = sessions[session_idx].session.password {
                        if join_password_input == *password {
                            println!("Password correct! Joining session: {}", sessions[session_idx].session.name);
                            show_password_dialog = false;
                            current_screen = GameScreen::Lobby;
                        } else {
                            println!("Wrong password!");
                            join_password_input.clear();
                        }
                    }
                }
            }

            if is_key_pressed(KeyCode::Escape) {
                show_password_dialog = false;
                join_password_input.clear();
            }
        }

        next_frame().await;
    }

}

