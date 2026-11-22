use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpicGame {
    pub id: String,
    pub app_name: String,
    pub name: String,
    pub platform: String,
    pub folder_name: String,
    pub install_path: String,
    pub launch_executable: String,
    pub image_url: String,
    pub hero_url: String,
    pub launch_url: String,
    pub installed: bool,
    pub genre: String,
}

#[derive(Debug, Deserialize)]
struct EpicManifest {
    #[serde(default, rename = "AppName")]
    app_name: String,
    #[serde(default, rename = "DisplayName")]
    display_name: String,
    #[serde(default, rename = "InstallLocation")]
    install_location: String,
    #[serde(default, rename = "LaunchExecutable")]
    launch_executable: String,
    #[serde(default, rename = "CatalogItemId")]
    catalog_item_id: String,
    #[serde(default, rename = "CatalogNamespace")]
    catalog_namespace: String,
}

/// Identifie les dossiers de manifestes Epic Games Launcher sur Windows
fn get_epic_manifest_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    // 1. Emplacement standard Windows ProgramData
    if let Ok(program_data) = std::env::var("ProgramData") {
        let p = PathBuf::from(program_data)
            .join("Epic")
            .join("EpicGamesLauncher")
            .join("Data")
            .join("Manifests");
        if p.is_dir() {
            dirs.push(p);
        }
    }

    // 2. Emplacement alternatif dans AppData Local
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let p = PathBuf::from(local_app_data)
            .join("EpicGamesLauncher")
            .join("Saved")
            .join("Manifests");
        if p.is_dir() {
            dirs.push(p);
        }
    }

    dirs
}

/// Commande Tauri : Scanne les jeux Epic Games installés sur la machine
#[tauri::command]
pub fn scan_epic_games() -> Result<Vec<EpicGame>, String> {
    let mut games = Vec::new();
    let manifest_dirs = get_epic_manifest_dirs();

    for dir in manifest_dirs {
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("item") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(manifest) = serde_json::from_str::<EpicManifest>(&content) {
                            if !manifest.display_name.is_empty() && !manifest.app_name.is_empty() {
                                let launch_url = format!(
                                    "com.epicgames.launcher://apps/{}?action=launch&silent=true",
                                    manifest.app_name
                                );
                                
                                // Détermine si le jeu est réellement présent sur le disque
                                let is_installed = if !manifest.install_location.is_empty() {
                                    Path::new(&manifest.install_location).is_dir()
                                } else {
                                    false
                                };

                                let folder_name = Path::new(&manifest.install_location)
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or(&manifest.display_name)
                                    .to_string();

                                // Image par défaut ou CDN Epic Games
                                let image_url = "https://cdn2.unrealengine.com/epic-games-store-og-image-1200x630-1200x630-802521946.jpg".to_string();
                                let hero_url = image_url.clone();

                                games.push(EpicGame {
                                    id: format!("epic_{}", manifest.app_name),
                                    app_name: manifest.app_name,
                                    name: manifest.display_name,
                                    platform: "epic".to_string(),
                                    folder_name,
                                    install_path: manifest.install_location,
                                    launch_executable: manifest.launch_executable,
                                    image_url,
                                    hero_url,
                                    launch_url,
                                    installed: is_installed,
                                    genre: "Epic Game".to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Trie par ordre alphabétique
    games.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(games)
}

/// Helper pour exécuter un protocole Epic Games sous Windows
fn launch_epic_protocol(url: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        Command::new("cmd")
            .args(["/C", "start", "", url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Erreur protocole Epic Games: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Erreur protocole Epic Games: {}", e))?;
    }

    Ok(format!("Action Epic Games exécutée : {}", url))
}

/// Commande Tauri : Lance un jeu Epic Games
#[tauri::command]
pub fn launch_epic_game(app_name: String) -> Result<String, String> {
    let url = format!("com.epicgames.launcher://apps/{}?action=launch&silent=true", app_name);
    launch_epic_protocol(&url)
}

/// Commande Tauri : Déclenche l'installation d'un jeu Epic Games
#[tauri::command]
pub fn install_epic_game(app_name: String) -> Result<String, String> {
    let url = format!("com.epicgames.launcher://apps/{}?action=install", app_name);
    launch_epic_protocol(&url)
}

/// Commande Tauri : Déclenche la désinstallation d'un jeu Epic Games
#[tauri::command]
pub fn uninstall_epic_game(app_name: String) -> Result<String, String> {
    let url = format!("com.epicgames.launcher://apps/{}?action=uninstall", app_name);
    launch_epic_protocol(&url)
}
