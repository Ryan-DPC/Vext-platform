use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamGame {
    pub id: String,
    pub app_id: String,
    pub name: String,
    pub platform: String,
    pub folder_name: String,
    pub install_path: String,
    pub image_url: String,
    pub hero_url: String,
    pub launch_url: String,
    pub installed: bool,
    pub genre: String,
}

/// Identifie le chemin d'installation de Steam sur la machine
fn find_steam_root() -> Option<PathBuf> {
    // 1. Chemins standards d'installation sous Windows
    let candidates = [
        r"C:\Program Files (x86)\Steam",
        r"C:\Program Files\Steam",
        r"D:\Steam",
        r"E:\Steam",
    ];

    for path_str in candidates {
        let p = PathBuf::from(path_str);
        if p.is_dir() && p.join("steamapps").is_dir() {
            return Some(p);
        }
    }

    // 2. Recherche alternative via dossier utilisateur AppData / local
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let p = PathBuf::from(local_app_data).join("Steam");
        if p.is_dir() && p.join("steamapps").is_dir() {
            return Some(p);
        }
    }

    None
}

/// Parse le fichier libraryfolders.vdf pour découvrir toutes les bibliothèques sur tous les disques
fn get_steam_libraries(steam_root: &Path) -> Vec<PathBuf> {
    let mut libraries = vec![steam_root.to_path_buf()];
    let vdf_path = steam_root.join("steamapps").join("libraryfolders.vdf");

    if let Ok(content) = fs::read_to_string(&vdf_path) {
        // Extraction de chaque ligne contenant "path" "chemin"
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("\"path\"") {
                let parts: Vec<&str> = trimmed.split('"').collect();
                if parts.len() >= 4 {
                    let raw_path = parts[3].replace(r"\\", r"\");
                    let p = PathBuf::from(raw_path);
                    if p.is_dir() && !libraries.contains(&p) {
                        libraries.push(p);
                    }
                }
            }
        }
    }

    libraries
}

/// Analyse un fichier appmanifest_<appid>.acf
fn parse_acf_file(acf_path: &Path, library_root: &Path) -> Option<SteamGame> {
    let content = fs::read_to_string(acf_path).ok()?;

    let mut appid = String::new();
    let mut name = String::new();
    let mut installdir = String::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("\"appid\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                appid = parts[3].to_string();
            }
        } else if trimmed.starts_with("\"name\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                name = parts[3].to_string();
            }
        } else if trimmed.starts_with("\"installdir\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                installdir = parts[3].to_string();
            }
        }
    }

    if appid.is_empty() || name.is_empty() {
        return None;
    }

    // Filtre les redistribuables et outils internes Steam
    let ignored_appids = ["228980", "228990", "107410", "250820"];
    if ignored_appids.contains(&appid.as_str()) {
        return None;
    }

    let install_path = library_root
        .join("steamapps")
        .join("common")
        .join(&installdir)
        .to_string_lossy()
        .to_string();

    let image_url = format!(
        "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900.jpg",
        appid
    );
    let hero_url = format!(
        "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_hero.jpg",
        appid
    );
    let launch_url = format!("steam://run/{}", appid);

    Some(SteamGame {
        id: format!("steam_{}", appid),
        app_id: appid,
        name,
        platform: "steam".to_string(),
        folder_name: installdir,
        install_path,
        image_url,
        hero_url,
        launch_url,
        installed: true,
        genre: "Steam".to_string(),
    })
}

/// Commande Tauri : Scanne l'ensemble des bibliothèques Steam de l'ordinateur
#[tauri::command]
pub fn scan_steam_games() -> Result<Vec<SteamGame>, String> {
    let steam_root = match find_steam_root() {
        Some(root) => root,
        None => return Ok(Vec::new()),
    };

    let libraries = get_steam_libraries(&steam_root);
    let mut games = Vec::new();

    for lib in libraries {
        let steamapps = lib.join("steamapps");
        if !steamapps.is_dir() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&steamapps) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if file_name.starts_with("appmanifest_") && file_name.ends_with(".acf") {
                        if let Some(game) = parse_acf_file(&path, &lib) {
                            games.push(game);
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

/// Commande Tauri : Lance un jeu Steam en mode silencieux via le protocole URI
#[tauri::command]
pub fn launch_steam_game(app_id: String) -> Result<String, String> {
    let url = format!("steam://run/{}", app_id);

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        Command::new("cmd")
            .args(["/C", "start", "", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Erreur lors du lancement Steam: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Erreur lors du lancement Steam: {}", e))?;
    }

    Ok(format!("Jeu Steam {} lancé avec succès", app_id))
}
