use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
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

/// Commande Tauri : installe un jeu Steam SANS la fenêtre de confirmation de Steam.
/// Méthode : on écrit appmanifest_<appid>.acf (état « mise à jour requise ») puis on redémarre Steam,
/// qui trouve le jeu en attente et le télécharge tout seul. Si le jeu est déjà connu de Steam, on garde steam://install.
#[tauri::command]
pub async fn install_steam_game(app_id: String, name: Option<String>) -> Result<String, String> {
    if app_id.is_empty() || !app_id.chars().all(|c| c.is_ascii_digit()) {
        return Err("Identifiant Steam invalide".to_string());
    }
    tauri::async_runtime::spawn_blocking(move || silent_install(&app_id, name))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(target_os = "windows")]
fn silent_install(app_id: &str, name: Option<String>) -> Result<String, String> {
    use std::process::Command;
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let root = find_steam_root().ok_or("Steam est introuvable sur cet ordinateur")?;
    let libraries = get_steam_libraries(&root);
    // Déjà présent (installé ou en attente) : Steam sait le gérer lui-même
    if libraries.iter().any(|l| l.join("steamapps").join(format!("appmanifest_{}.acf", app_id)).exists()) {
        return launch_steam_protocol(&format!("steam://install/{}", app_id));
    }

    let installdir: String = name.unwrap_or_default().chars()
        .filter(|c| !r#"<>:"/\|?*"#.contains(*c))
        .collect::<String>().trim().to_string();
    let installdir = if installdir.is_empty() { app_id.to_string() } else { installdir };
    let acf = format!(
        "\"AppState\"
{{
	\"appid\"		\"{}\"
	\"Universe\"		\"1\"
	\"installdir\"		\"{}\"
	\"StateFlags\"		\"1026\"
}}
",
        app_id, installdir
    );

    let steam_exe = root.join("steam.exe");
    let is_running = || {
        Command::new("tasklist").args(["/FI", "IMAGENAME eq steam.exe", "/NH"])
            .creation_flags(CREATE_NO_WINDOW).output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_lowercase().contains("steam.exe"))
            .unwrap_or(false)
    };

    // 1. Arrêt propre de Steam (s'il tourne)
    if is_running() {
        let _ = Command::new(&steam_exe).arg("-shutdown").creation_flags(CREATE_NO_WINDOW).spawn();
        for _ in 0..40 {
            if !is_running() { break; }
            std::thread::sleep(std::time::Duration::from_millis(1000));
        }
        if is_running() { return Err("Steam ne s'est pas fermé à temps".to_string()); }
    }

    // 2. Écriture du manifest dans la bibliothèque principale
    let apps_dir = root.join("steamapps");
    fs::create_dir_all(&apps_dir).map_err(|e| e.to_string())?;
    fs::write(apps_dir.join(format!("appmanifest_{}.acf", app_id)), acf).map_err(|e| e.to_string())?;

    // 3. Redémarrage de Steam : il reprend le téléchargement en attente
    Command::new(&steam_exe).current_dir(&root).creation_flags(CREATE_NO_WINDOW).spawn()
        .map_err(|e| format!("Impossible de relancer Steam : {}", e))?;
    Ok("Installation lancée dans Steam".to_string())
}

#[cfg(not(target_os = "windows"))]
fn silent_install(app_id: &str, _name: Option<String>) -> Result<String, String> {
    launch_steam_protocol(&format!("steam://install/{}", app_id))
}

/// Commande Tauri : Déclenche la désinstallation d'un jeu Steam
#[tauri::command]
pub fn uninstall_steam_game(app_id: String) -> Result<String, String> {
    let url = format!("steam://uninstall/{}", app_id);
    launch_steam_protocol(&url)
}

/// Commande Tauri : Ouvre une URL externe (ex: Steam OpenID) dans le navigateur système
/// Utilise rundll32 url.dll,FileProtocolHandler sous Windows pour éviter que cmd.exe ne tronque l'URL au premier '&'
#[tauri::command]
pub fn open_external_url(url: String) -> Result<String, String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("URL externe invalide".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Erreur ouverture navigateur: {}", e))?;
        return Ok(format!("URL ouverte : {}", url));
    }

    #[cfg(not(target_os = "windows"))]
    {
        launch_steam_protocol(&url)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Steam Account (OpenID 2.0 + Web API)
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SteamAccount {
    pub steam_id: String,
    pub display_name: String,
    pub avatar_url: String,
}

fn get_account_file_path() -> Option<PathBuf> {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let dir = PathBuf::from(local_app_data).join("com.vext.app");
        let _ = fs::create_dir_all(&dir);
        return Some(dir.join("steam_account.json"));
    }
    None
}

fn load_steam_account() -> Option<SteamAccount> {
    let path = get_account_file_path()?;
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<SteamAccount>(&data).ok()
}

fn save_steam_account(account: &SteamAccount) {
    if let Some(path) = get_account_file_path() {
        if let Ok(json) = serde_json::to_string_pretty(account) {
            let _ = fs::write(path, json);
        }
    }
}

fn get_config_file_path() -> Option<PathBuf> {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let dir = PathBuf::from(local_app_data).join("com.vext.app");
        let _ = fs::create_dir_all(&dir);
        return Some(dir.join("steam_config.json"));
    }
    None
}

fn load_steam_config() -> HashMap<String, String> {
    if let Some(path) = get_config_file_path() {
        if let Ok(data) = fs::read_to_string(path) {
            if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(&data) {
                return map;
            }
        }
    }
    HashMap::new()
}

fn save_steam_config(config: &HashMap<String, String>) {
    if let Some(path) = get_config_file_path() {
        if let Ok(json) = serde_json::to_string_pretty(config) {
            let _ = fs::write(path, json);
        }
    }
}

/// Commande Tauri : Lire la clé API Steam stockée localement
#[tauri::command]
pub fn get_steam_api_key() -> Option<String> {
    let config = load_steam_config();
    config.get("api_key").cloned()
}

/// Commande Tauri : Sauvegarder la clé API Steam
#[tauri::command]
pub fn set_steam_api_key(key: String) -> Result<(), String> {
    let mut config = load_steam_config();
    config.insert("api_key".to_string(), key);
    save_steam_config(&config);
    Ok(())
}

/// Commande Tauri : Lire le compte Steam connecté
#[tauri::command]
pub fn get_steam_account() -> Option<SteamAccount> {
    load_steam_account()
}

/// Commande Tauri : Déconnecter le compte Steam
#[tauri::command]
pub fn disconnect_steam_account() -> Result<(), String> {
    if let Some(path) = get_account_file_path() {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

/// Parse l'URL de callback OpenID et extrait le SteamID64
fn extract_steam_id_from_claimed_id(claimed_id: &str) -> Option<String> {
    // claimed_id = "https://steamcommunity.com/openid/id/76561198XXXXXXXXX"
    let prefix = "https://steamcommunity.com/openid/id/";
    if claimed_id.starts_with(prefix) {
        let id = &claimed_id[prefix.len()..];
        if id.chars().all(|c| c.is_ascii_digit()) && id.len() >= 15 {
            return Some(id.to_string());
        }
    }
    None
}

/// Parse la query string d'une requête HTTP
fn parse_query_string(query: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for pair in query.split('&') {
        let mut kv = pair.splitn(2, '=');
        if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
            let key = k.replace('+', " ");
            let val = v.replace('+', " ");
            // URL-decode basique (ne gère que %XX essentiels)
            map.insert(url_decode(&key), url_decode(&val));
        }
    }
    map
}

fn url_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex_str) = std::str::from_utf8(&bytes[i+1..i+3]) {
                if let Ok(byte_val) = u8::from_str_radix(hex_str, 16) {
                    result.push(byte_val as char);
                    i += 3;
                    continue;
                }
            }
        }
        result.push(bytes[i] as char);
        i += 1;
    }
    result
}

/// Envoie une réponse HTTP simple à la connexion et ferme
fn send_http_response(mut stream: TcpStream, status: u16, body: &str) {
    let status_text = if status == 200 { "OK" } else { "Internal Server Error" };
    let response = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status, status_text, body.len(), body
    );
    let _ = stream.write_all(response.as_bytes());
}

/// Résout le nom + avatar d'un SteamID via l'API publique (GetPlayerSummaries)
fn fetch_player_summary(steam_id: &str, api_key: &str) -> (String, String) {
    let url = format!(
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={}&steamids={}",
        api_key, steam_id
    );
    if let Ok(resp) = reqwest::blocking::get(&url) {
        if let Ok(json) = resp.json::<serde_json::Value>() {
            if let Some(player) = json
                .get("response")
                .and_then(|r| r.get("players"))
                .and_then(|p| p.as_array())
                .and_then(|a| a.first())
            {
                let name = player.get("personaname")
                    .and_then(|n| n.as_str())
                    .unwrap_or("Steam User")
                    .to_string();
                let avatar = player.get("avatarfull")
                    .and_then(|a| a.as_str())
                    .unwrap_or("")
                    .to_string();
                return (name, avatar);
            }
        }
    }
    ("Steam User".to_string(), String::new())
}

/// Commande Tauri : Lance le flux OpenID Steam (Option A : serveur TCP local temporaire)
/// Retourne le SteamID64 après validation ou une erreur.
#[tauri::command]
pub fn steam_openid_login() -> Result<String, String> {
    // 1. Trouver un port libre
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Impossible de créer le serveur local: {}", e))?;
    let port = listener.local_addr()
        .map_err(|e| format!("Impossible d'obtenir le port: {}", e))?
        .port();

    let return_to = format!("http://127.0.0.1:{}/callback", port);
    let realm = format!("http://127.0.0.1:{}", port);

    // 2. Construire l'URL Steam OpenID
    let openid_url = format!(
        "https://steamcommunity.com/openid/login\
        ?openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0\
        &openid.mode=checkid_setup\
        &openid.return_to={return_to}\
        &openid.realm={realm}\
        &openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select\
        &openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select",
        return_to = url_encode(&return_to),
        realm = url_encode(&realm)
    );

    // 3. Ouvrir le navigateur par défaut avec l'URL Steam
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new("cmd")
            .args(["/C", "start", "", &openid_url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Impossible d'ouvrir le navigateur: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&openid_url)
            .spawn()
            .map_err(|e| format!("Impossible d'ouvrir le navigateur: {}", e))?;
    }

    // 4. Attendre la requête de callback (timeout 5 minutes)
    listener.set_nonblocking(false)
        .map_err(|e| format!("Erreur listener: {}", e))?;

    // Timeout global via thread
    let (tx, rx) = std::sync::mpsc::channel::<Result<String, String>>();
    let tx_clone = tx.clone();

    std::thread::spawn(move || {
        // Timeout de 5 minutes
        std::thread::sleep(std::time::Duration::from_secs(300));
        let _ = tx_clone.send(Err("Timeout: connexion Steam annulée".to_string()));
    });

    std::thread::spawn(move || {
        match listener.accept() {
            Ok((stream, _)) => {
                let result = handle_openid_callback(stream);
                let _ = tx.send(result);
            }
            Err(e) => {
                let _ = tx.send(Err(format!("Erreur connexion: {}", e)));
            }
        }
    });

    // Attendre le résultat (bloquant pour Tauri command)
    rx.recv()
        .map_err(|e| format!("Erreur réception: {}", e))?
}

fn url_encode(s: &str) -> String {
    let mut encoded = String::new();
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'0'..=b'9' | b'a'..=b'z' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

fn handle_openid_callback(stream: TcpStream) -> Result<String, String> {
    let mut reader = BufReader::new(stream.try_clone().map_err(|e| e.to_string())?);

    // Lire la ligne de requête HTTP
    let mut request_line = String::new();
    reader.read_line(&mut request_line).map_err(|e| e.to_string())?;

    // GET /callback?openid.claimed_id=...&openid.mode=id_res HTTP/1.1
    let path_and_query = request_line
        .split_whitespace()
        .nth(1)
        .unwrap_or("/");

    let query_str = path_and_query
        .splitn(2, '?')
        .nth(1)
        .unwrap_or("");

    let params = parse_query_string(query_str);

    let mode = params.get("openid.mode").map(|s| s.as_str()).unwrap_or("");
    if mode == "cancel" {
        let body = "<html><body><h2>Connexion Steam annulée. Vous pouvez fermer cet onglet.</h2></body></html>";
        send_http_response(stream, 200, body);
        return Err("L'utilisateur a annulé la connexion Steam".to_string());
    }

    if mode != "id_res" {
        let body = "<html><body><h2>Réponse Steam inattendue. Vous pouvez fermer cet onglet.</h2></body></html>";
        send_http_response(stream, 200, body);
        return Err(format!("Mode OpenID inattendu: {}", mode));
    }

    let claimed_id = params.get("openid.claimed_id").cloned().unwrap_or_default();
    let steam_id = extract_steam_id_from_claimed_id(&claimed_id)
        .ok_or_else(|| format!("SteamID invalide dans claimed_id: {}", claimed_id))?;

    // Répondre à Steam / au navigateur
    let body = format!(
        "<html><body style='font-family:sans-serif;text-align:center;padding:40px'>
        <h2 style='color:#1b2838'>✅ Connecté à Steam !</h2>
        <p>SteamID : <code>{}</code></p>
        <p>Vous pouvez fermer cet onglet et revenir sur VEXT.</p>
        </body></html>",
        steam_id
    );
    send_http_response(stream, 200, &body);

    // Récupérer le nom et l'avatar via l'API si une clé existe
    let config = load_steam_config();
    let (display_name, avatar_url) = if let Some(api_key) = config.get("api_key") {
        fetch_player_summary(&steam_id, api_key)
    } else {
        (format!("SteamID {}", &steam_id[steam_id.len().saturating_sub(4)..]), String::new())
    };

    // Sauvegarder le compte
    let account = SteamAccount { steam_id: steam_id.clone(), display_name, avatar_url };
    save_steam_account(&account);

    Ok(steam_id)
}

/// Jeu Steam retourné par l'API GetOwnedGames
#[derive(Debug, Serialize, Deserialize)]
struct ApiGameRaw {
    appid: u64,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    playtime_forever: u64,
    #[serde(default)]
    img_icon_url: Option<String>,
}

/// Commande Tauri : Récupère tous les jeux possédés via la Steam Web API
#[tauri::command]
pub fn fetch_steam_owned_games(steam_id: String, api_key: String) -> Result<Vec<SteamGame>, String> {
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/\
        ?key={}&steamid={}&include_appinfo=1&include_played_free_games=1&format=json",
        api_key, steam_id
    );

    let resp = reqwest::blocking::get(&url)
        .map_err(|e| format!("Erreur réseau Steam API: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Steam API error HTTP {}", resp.status()));
    }

    let json: serde_json::Value = resp.json()
        .map_err(|e| format!("Erreur parsing réponse Steam API: {}", e))?;

    let games_array = json
        .get("response")
        .and_then(|r| r.get("games"))
        .and_then(|g| g.as_array())
        .ok_or_else(|| "Bibliothèque vide ou profil privé (activez 'Détails des jeux' dans la confidentialité Steam)".to_string())?;

    let mut games: Vec<SteamGame> = games_array
        .iter()
        .filter_map(|g| serde_json::from_value::<ApiGameRaw>(g.clone()).ok())
        .filter(|g| {
            // Exclure redistributables internes
            let ignored = [228980u64, 228990, 107410, 250820, 480, 7, 760];
            !ignored.contains(&g.appid)
        })
        .map(|g| {
            let app_id = g.appid.to_string();
            let name = g.name.unwrap_or_else(|| format!("Steam Game ({})", app_id));
            let image_url = format!(
                "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900.jpg",
                app_id
            );
            let hero_url = format!(
                "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_hero.jpg",
                app_id
            );
            SteamGame {
                id: format!("steam_{}", app_id),
                app_id,
                name,
                platform: "steam".to_string(),
                folder_name: String::new(),
                install_path: String::new(),
                image_url,
                hero_url,
                launch_url: format!("steam://run/{}", g.appid),
                installed: false, // sera mis à jour par le scan local
                genre: "Steam".to_string(),
            }
        })
        .collect();

    games.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(games)
}
