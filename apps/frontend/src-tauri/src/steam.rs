use std::collections::{HashMap, HashSet};
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

/// Identifie le chemin d'installation de Steam sur la machine (Registre Windows + chemins standards)
fn find_steam_root() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if let Ok(output) = Command::new("reg")
            .args(["query", r"HKCU\Software\Valve\Steam", "/v", "SteamPath"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if line.contains("SteamPath") && line.contains("REG_SZ") {
                        if let Some(raw) = line.split("REG_SZ").nth(1) {
                            let normalized = raw.trim().replace('/', r"\");
                            let p = PathBuf::from(normalized);
                            if p.is_dir() && p.join("steamapps").is_dir() {
                                return Some(p);
                            }
                        }
                    }
                }
            }
        }
    }

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
    let ignored_appids = ["228980", "228990", "107410", "250820", "480", "7", "760"];
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

    // 1. Motif moderne Valve Steam Client (appinfo v28+) :
    // [0x02, 0x01, 0x00, 0x00, 0x00, id0, id1, id2, id3, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00]
    let full_pattern = [
        0x02, 0x01, 0x00, 0x00, 0x00,
        needle[0], needle[1], needle[2], needle[3],
        0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00,
    ];

    if let Some(pos) = appinfo_bytes.windows(full_pattern.len()).position(|w| w == full_pattern) {
        let str_start = pos + full_pattern.len();
        if let Some(null_pos) = appinfo_bytes[str_start..].iter().position(|&b| b == 0) {
            let candidate_bytes = &appinfo_bytes[str_start..str_start + null_pos];
            if let Ok(name_str) = std::str::from_utf8(candidate_bytes) {
                let clean = name_str.trim();
                if !clean.is_empty() && clean.len() < 120 {
                    return Some(clean.to_string());
                }
            }
        }
    }

    // 2. Motif court :
    let short_pattern = [
        0x02, 0x01, 0x00, 0x00, 0x00,
        needle[0], needle[1], needle[2], needle[3],
    ];

    if let Some(pos) = appinfo_bytes.windows(short_pattern.len()).position(|w| w == short_pattern) {
        let end_idx = (pos + short_pattern.len() + 150).min(appinfo_bytes.len());
        let chunk = &appinfo_bytes[pos + short_pattern.len()..end_idx];
        let name_header = [0x01, 0x04, 0x00, 0x00, 0x00];
        if let Some(hdr_pos) = chunk.windows(name_header.len()).position(|w| w == name_header) {
            let str_start = hdr_pos + name_header.len();
            if let Some(null_pos) = chunk[str_start..].iter().position(|&b| b == 0) {
                if let Ok(name_str) = std::str::from_utf8(&chunk[str_start..str_start + null_pos]) {
                    let clean = name_str.trim();
                    if !clean.is_empty() && clean.len() < 120 {
                        return Some(clean.to_string());
                    }
                }
            }
        }
    }

    None
}

/// Cache persistant local pour les noms de jeux Steam
fn get_cache_file_path() -> Option<PathBuf> {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let dir = PathBuf::from(local_app_data).join("com.vext.app");
        let _ = fs::create_dir_all(&dir);
        return Some(dir.join("steam_name_cache.json"));
    }
    None
}

fn load_name_cache() -> HashMap<String, String> {
    if let Some(path) = get_cache_file_path() {
        if let Ok(data) = fs::read_to_string(path) {
            if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(&data) {
                return map;
            }
        }
    }
    HashMap::new()
}

fn save_name_cache(cache: &HashMap<String, String>) {
    if let Some(path) = get_cache_file_path() {
        if let Ok(json) = serde_json::to_string_pretty(cache) {
            let _ = fs::write(path, json);
        }
    }
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
    let mut name_cache = load_name_cache();
    let mut cache_modified = false;

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
                            name_cache.insert(game.app_id.clone(), game.name.clone());
                            cache_modified = true;
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
                        // Either "12345" { or "12345" alone on a line
                        let is_header = (trimmed.starts_with('"') && trimmed.ends_with('{'))
                            || (trimmed.starts_with('"') && trimmed.ends_with('"') && trimmed.len() >= 4);

                        if is_header {
                            let clean = trimmed.trim_matches(|c| c == '"' || c == '{' || c == ' ' || c == '\t');
                            if clean.chars().all(|c| c.is_ascii_digit()) && clean.len() >= 2 && clean.len() <= 10 {
                                owned_app_ids.insert(clean.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Pour tous les jeux possédés mais non installés, résout les titres via cache / appinfo.vdf
    let ignored_appids = ["228980", "228990", "107410", "250820", "480", "7", "760", "760160", "218"];
    let appinfo_path = steam_root.join("appcache").join("appinfo.vdf");
    let appinfo_bytes = fs::read(&appinfo_path).unwrap_or_default();

    for app_id in owned_app_ids {
        if installed_app_ids.contains(&app_id) || ignored_appids.contains(&app_id.as_str()) {
            continue;
        }

        // Tente d'abord le cache mémoire/fichier
        let resolved_name = if let Some(cached) = name_cache.get(&app_id) {
            Some(cached.clone())
        } else if let Ok(app_id_u32) = app_id.parse::<u32>() {
            let n = resolve_game_name_from_appinfo(&appinfo_bytes, app_id_u32);
            if let Some(ref found) = n {
                name_cache.insert(app_id.clone(), found.clone());
                cache_modified = true;
            }
            n
        } else {
            None
        };

        // Si non trouvé dans appinfo.vdf, on ne jette pas le jeu : nom propre par défaut et images Steam réelles
        let game_name = resolved_name.unwrap_or_else(|| {
            format!("Steam Game ({})", app_id)
        });

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

    if cache_modified {
        save_name_cache(&name_cache);
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

/// Commande Tauri : Ouvre une URL externe (ex: Steam OpenID) dans le navigateur système
#[tauri::command]
pub fn open_external_url(url: String) -> Result<String, String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("URL externe invalide".to_string());
    }
    launch_steam_protocol(&url)
}
