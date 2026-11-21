use std::collections::HashSet;
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

/// Analyse un fichier appmanifest_<appid>.acf (jeux déjà installés)
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

/// Résout le titre d'un jeu dans appinfo.vdf
fn resolve_game_name_from_appinfo(appinfo_bytes: &[u8], app_id_u32: u32) -> Option<String> {
    let needle = app_id_u32.to_le_bytes();
    let mut search_pos = 0;

    while search_pos + 4 <= appinfo_bytes.len() {
        if let Some(rel_pos) = appinfo_bytes[search_pos..].windows(4).position(|w| w == needle) {
            let match_pos = search_pos + rel_pos;
            let end_limit = (match_pos + 300).min(appinfo_bytes.len());
            let chunk = &appinfo_bytes[match_pos..end_limit];

            // Recherche la séquence d'en-tête de nom dans le chunk
            let patterns: [&[u8]; 2] = [
                &[0x01, 0x04, 0x00, 0x00, 0x00],
                &[0x01, 0x01, 0x00, 0x00, 0x00],
            ];

            for pat in patterns {
                if let Some(pat_pos) = chunk.windows(pat.len()).position(|w| w == pat) {
                    let str_start = pat_pos + pat.len();
                    if let Some(null_pos) = chunk[str_start..].iter().position(|&b| b == 0) {
                        let candidate_bytes = &chunk[str_start..str_start + null_pos];
                        if let Ok(name_str) = std::str::from_utf8(candidate_bytes) {
                            let clean = name_str.trim();
                            if clean.len() >= 2
                                && !clean.starts_with("http")
                                && !clean.starts_with("windows")
                                && !clean.starts_with("6f488")
                            {
                                return Some(clean.to_string());
                            }
                        }
                    }
                }
            }

            search_pos = match_pos + 4;
        } else {
            break;
        }
    }

    None
}

/// Commande Tauri : Scanne l'ensemble des bibliothèques Steam (jeux installés ET non installés possédés)
#[tauri::command]
pub fn scan_steam_games() -> Result<Vec<SteamGame>, String> {
    let steam_root = match find_steam_root() {
        Some(root) => root,
        None => return Ok(Vec::new()),
    };

    let libraries = get_steam_libraries(&steam_root);
    let mut games = Vec::new();
    let mut installed_app_ids = HashSet::new();

    // 1. Scanne les jeux installés (.acf)
    for lib in &libraries {
        let steamapps = lib.join("steamapps");
        if !steamapps.is_dir() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&steamapps) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if file_name.starts_with("appmanifest_") && file_name.ends_with(".acf") {
                        if let Some(game) = parse_acf_file(&path, lib) {
                            installed_app_ids.insert(game.app_id.clone());
                            games.push(game);
                        }
                    }
                }
            }
        }
    }

    // 2. Scanne tous les jeux possédés via userdata/*/config/localconfig.vdf
    let userdata_dir = steam_root.join("userdata");
    let mut owned_app_ids = HashSet::new();

    if let Ok(entries) = fs::read_dir(&userdata_dir) {
        for entry in entries.flatten() {
            let localconfig_path = entry.path().join("config").join("localconfig.vdf");
            if let Ok(content) = fs::read_to_string(&localconfig_path) {
                if let Some(apps_idx) = content.to_lowercase().find("\"apps\"") {
                    let sub = &content[apps_idx..];
                    for line in sub.lines() {
                        let trimmed = line.trim();
                        // Cherche les blocs de clé comme "730" ou "223850"
                        if trimmed.starts_with('"') && trimmed.ends_with('{') {
                            let cleaned = trimmed.trim_end_matches('{').trim();
                            let parts: Vec<&str> = cleaned.split('"').filter(|s| !s.is_empty()).collect();
                            if let Some(first) = parts.first() {
                                if first.chars().all(|c| c.is_ascii_digit()) && first.len() >= 2 {
                                    owned_app_ids.insert(first.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Pour tous les jeux possédés mais non installés, résout les titres via appinfo.vdf
    let ignored_appids = ["228980", "228990", "107410", "250820", "7"];
    let appinfo_path = steam_root.join("appcache").join("appinfo.vdf");
    let appinfo_bytes = fs::read(&appinfo_path).unwrap_or_default();

    for app_id in owned_app_ids {
        if installed_app_ids.contains(&app_id) || ignored_appids.contains(&app_id.as_str()) {
            continue;
        }

        if let Ok(app_id_u32) = app_id.parse::<u32>() {
            let name = if !appinfo_bytes.is_empty() {
                resolve_game_name_from_appinfo(&appinfo_bytes, app_id_u32)
            } else {
                None
            };

            // On n'inclut que les jeux dont on a le nom valide
            if let Some(game_name) = name {
                let image_url = format!(
                    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900.jpg",
                    app_id
                );
                let hero_url = format!(
                    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_hero.jpg",
                    app_id
                );
                let launch_url = format!("steam://run/{}", app_id);

                games.push(SteamGame {
                    id: format!("steam_{}", app_id),
                    app_id,
                    name: game_name,
                    platform: "steam".to_string(),
                    folder_name: String::new(),
                    install_path: String::new(),
                    image_url,
                    hero_url,
                    launch_url,
                    installed: false,
                    genre: "Steam".to_string(),
                });
            }
        }
    }

    // Trie par ordre alphabétique
    games.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(games)
}

/// Helper pour exécuter une URL de protocole Steam sous Windows en mode silencieux
fn launch_steam_protocol(url: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        Command::new("cmd")
            .args(["/C", "start", "", url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Erreur protocole Steam: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Erreur protocole Steam: {}", e))?;
    }

    Ok(format!("Action Steam exécutée : {}", url))
}

/// Commande Tauri : Lance un jeu Steam
#[tauri::command]
pub fn launch_steam_game(app_id: String) -> Result<String, String> {
    let url = format!("steam://run/{}", app_id);
    launch_steam_protocol(&url)
}

/// Commande Tauri : Déclenche l'installation d'un jeu Steam sans ouvrir la boutique
#[tauri::command]
pub fn install_steam_game(app_id: String) -> Result<String, String> {
    let url = format!("steam://install/{}", app_id);
    launch_steam_protocol(&url)
}

/// Commande Tauri : Déclenche la désinstallation d'un jeu Steam
#[tauri::command]
pub fn uninstall_steam_game(app_id: String) -> Result<String, String> {
    let url = format!("steam://uninstall/{}", app_id);
    launch_steam_protocol(&url)
}
