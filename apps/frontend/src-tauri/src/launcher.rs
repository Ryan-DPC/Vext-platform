use std::path::Path;
use std::process::Command;
use std::fs;
use tauri::{Window, Emitter};

#[derive(serde::Deserialize)]
pub struct UserData {
    pub user: Option<serde_json::Value>,
    pub token: Option<String>,
}

#[derive(serde::Deserialize)]
struct Manifest {
    id: Option<String>,
    // name: Option<String>,
    entry: Option<String>,
    #[serde(rename = "entryPoint")]
    entry_point: Option<String>,
    #[serde(rename = "mainFile")]
    main_file: Option<String>,
}

#[tauri::command]
pub fn launch_game(
    window: Window,
    install_path: String,
    folder_name: String,
    user_data: Option<UserData>,
) -> Result<String, String> {
    let game_dir = Path::new(&install_path).join("Ether").join(&folder_name);
    let manifest_path = game_dir.join("manifest.json");

    // 1. Read Manifest
    let data = fs::read_to_string(&manifest_path).map_err(|_| "CRITICAL: manifest.json missing".to_string())?;
    let manifest: Manifest = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    let entry_file = manifest.entry.or(manifest.entry_point).or(manifest.main_file)
        .ok_or("CRITICAL: No 'entry' defined in manifest.json")?;

    let entry_path = game_dir.join(&entry_file);
    if !entry_path.exists() {
        return Err(format!("CRITICAL: Entry file '{}' not found.", entry_file));
    }

    // 4. Launch (Only Executables supported in Rust native launcher for now, HTML games would need a new Window)
    if entry_file.ends_with(".exe") {
        let mut cmd = Command::new(&entry_path);
        cmd.current_dir(&game_dir);
        
        // Pass env vars
        if let Some(data) = user_data {
            if let Some(user) = data.user {
                cmd.env("ETHER_USER", user.to_string());
            }
            if let Some(token) = data.token {
                cmd.env("ETHER_TOKEN", token);
            }
        }
        
        // Spawn detached
        match cmd.spawn() {
            Ok(mut child) => {
                let _ = window.emit("game:status", serde_json::json!({
                    "folderName": folder_name,
                    "status": "running"
                }));

                let window_clone = window.clone();
                let folder_name_clone = folder_name.clone();
                let game_id = manifest.id.clone(); // Optional, if available

                std::thread::spawn(move || {
                    match child.wait() {
                        Ok(status) => {
                            let _ = window_clone.emit("game:status", serde_json::json!({
                                "folderName": folder_name_clone,
                                "status": "stopped"
                            }));
                            
                            // Emit specific exit event for stats service
                            let _ = window_clone.emit("game:exited", serde_json::json!({
                                "folderName": folder_name_clone,
                                "gameId": game_id,
                                "code": status.code(),
                                "timestamp": std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_millis()
                            }));
                        },
                        Err(e) => {
                            eprintln!("Failed to wait on child process: {}", e);
                        }
                    }
                });

                Ok("Game Launched".to_string())
            },
            Err(e) => Err(e.to_string())
        }
    } else if entry_file.ends_with(".html") {
        // For HTML games, we probably need to open a new Tauri window
        // This requires main thread access usually, or using the AppHandle.
        // For simplified migration, we might skip HTML games support or open in system browser?
        // OR: send event back to Frontend to open a new Route used as game container?
        Err("HTML games not yet fully supported in native launcher migration.".to_string())
    } else {
        Err(format!("Unsupported entry file type: {}", entry_file))
    }
}
