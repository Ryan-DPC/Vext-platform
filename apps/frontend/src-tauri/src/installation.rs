use std::fs;
use std::path::Path;
use std::io::copy;
use reqwest::Client;
use zip::ZipArchive;
use futures_util::StreamExt;
use std::cmp::min;
use std::io::Write;
use tauri::{Window, Emitter};




#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    game_id: String,
    game_name: String,
    progress: u64,
    status: String,
}

#[tauri::command]
pub async fn install_game(
    window: Window,
    download_url: String,
    install_path: String,
    folder_name: String,
    game_id: String,
    game_name: String,
    backend_url: String,
) -> Result<String, String> {
    println!("🎮 [Rust] install_game called with:");
    println!("  download_url: {}", download_url);
    println!("  install_path: {}", install_path);
    println!("  folder_name: {}", folder_name);
    println!("  game_id: {}", game_id);
    println!("  game_name: {}", game_name);
    println!("  backend_url: {}", backend_url);

    let client = Client::new();
    let game_dir = Path::new(&install_path).join("Vext").join(&folder_name);
    
    println!("  game_dir: {:?}", game_dir);

    // Create directory
    println!("📁 Creating directory...");
    fs::create_dir_all(&game_dir).map_err(|e| {
        println!("❌ Failed to create directory: {}", e);
        e.to_string()
    })?;
    println!("✅ Directory created");

    let is_zip = download_url.ends_with(".zip");
    let file_name = if is_zip { "game.zip" } else { "Game.exe" };
    let file_path = game_dir.join(file_name);
    
    println!("  file_path: {:?}", file_path);

    // 1. Download
    println!("📥 Starting download from: {}", download_url);
    
    // Check for existing partial file
    let mut downloaded: u64 = 0;
    let mut file_mode = fs::OpenOptions::new();
    file_mode.write(true).create(true);
    
    if file_path.exists() {
        if let Ok(metadata) = fs::metadata(&file_path) {
            downloaded = metadata.len();
            println!("🔄 Found partial file. Size: {} bytes. Attempting resume...", downloaded);
            file_mode.append(true);
        }
    } else {
        file_mode.truncate(true);
    }

    let mut request = client
        .get(&download_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    if downloaded > 0 {
        request = request.header("Range", format!("bytes={}-", downloaded));
    }

    let res = request
        .send()
        .await
        .map_err(|e| {
            println!("❌ Download request failed: {}", e);
            e.to_string()
        })?;

    println!("📡 Response status: {}", res.status());

    let mut file = if res.status() == reqwest::StatusCode::PARTIAL_CONTENT {
        println!("✅ Server supports resume. Appending to existing file.");
        file_mode.open(&file_path).map_err(|e| e.to_string())?
    } else {
        if downloaded > 0 {
            println!("⚠️ Server does not support resume (or file validation failed). Restarting download.");
            downloaded = 0;
        }
        fs::OpenOptions::new().write(true).create(true).truncate(true).open(&file_path).map_err(|e| e.to_string())?
    };

    if !res.status().is_success() {
        println!("❌ Download failed with status: {}", res.status());
        return Err(format!("Download failed with status: {}", res.status()));
    }

    // Content-Length matches the *remaining* bytes if partial, or total if full
    let content_length = res.content_length().unwrap_or(0);
    let total_size = downloaded + content_length;
    
    println!("📊 Total size: {} bytes (Remaining: {})", total_size, content_length);
    
    let mut stream = res.bytes_stream();
    
    let _ = window.emit("install:progress", ProgressPayload {
        game_id: game_id.clone(),
        game_name: game_name.clone(),
        progress: if total_size > 0 { min(100, (downloaded * 100) / total_size) } else { 0 },
        status: "downloading".to_string(),
    });

    println!("⬇️ Starting download stream...");
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| {
            println!("❌ Error reading chunk: {}", e);
            e.to_string()
        })?;
        file.write_all(&chunk).map_err(|e| {
            println!("❌ Error writing chunk: {}", e);
            e.to_string()
        })?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let percent = min(100, (downloaded * 100) / total_size);
            let _ = window.emit("install:progress", ProgressPayload {
                game_id: game_id.clone(),
                game_name: game_name.clone(),
                progress: percent,
                status: "downloading".to_string(),
            });
        }
    }
    println!("✅ Download complete: {} bytes", downloaded);

    // 2. Extract (Only if Zip)
    if is_zip {
        println!("📦 Starting extraction...");
        let _ = window.emit("install:progress", ProgressPayload {
            game_id: game_id.clone(),
            game_name: game_name.clone(),
            progress: 100,
            status: "extracting".to_string(),
        });

        let file = fs::File::open(&file_path).map_err(|e| {
            println!("❌ Failed to open zip: {}", e);
            e.to_string()
        })?;
        let mut archive = ZipArchive::new(file).map_err(|e| {
            println!("❌ Failed to parse zip: {}", e);
            e.to_string()
        })?;

        println!("📁 Extracting {} files...", archive.len());
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| {
                println!("❌ Error reading archive entry {}: {}", i, e);
                e.to_string()
            })?;
            let outpath = match file.enclosed_name() {
                Some(path) => game_dir.join(path),
                None => continue,
            };

            // Check if this is a directory entry (use is_dir() which is more reliable)
            let is_directory = file.is_dir() || 
                               file.name().ends_with('/') || 
                               file.name().ends_with('\\');

            if is_directory {
                fs::create_dir_all(&outpath).map_err(|e| {
                    println!("❌ Failed to create dir {:?}: {}", outpath, e);
                    e.to_string()
                })?;
            } else {
                // Ensure parent directory exists
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(&p).map_err(|e| {
                            println!("❌ Failed to create parent dir {:?}: {}", p, e);
                            e.to_string()
                        })?;
                    }
                }
                let mut outfile = fs::File::create(&outpath).map_err(|e| {
                    println!("❌ Failed to create file {:?}: {}", outpath, e);
                    e.to_string()
                })?;
                copy(&mut file, &mut outfile).map_err(|e| {
                    println!("❌ Failed to copy to {:?}: {}", outpath, e);
                    e.to_string()
                })?;
            }
        }
        println!("✅ Extraction complete");
        
        // Cleanup Zip
        println!("🗑️ Cleaning up zip file...");
        fs::remove_file(&file_path).map_err(|e| {
            println!("❌ Failed to remove zip: {}", e);
            e.to_string()
        })?;
        println!("✅ Zip removed");
    } else {
        // It's an executable, we already saved it as Game.exe
        // No extraction needed.
    }

    // 3. Verify or Create Manifest
    let manifest_path = game_dir.join("manifest.json");
    
    // Calculate hashes for integrity check
    println!("🛡️ Calculating file hashes...");
    // We need to reference the verification module from the crate root
    // Since installation and verification are sibling modules, we might need crate::verification
    let file_hashes = crate::verification::generate_dir_hashes(&game_dir).unwrap_or_default();
    println!("✅ Hashed {} files", file_hashes.len());

    // Always check for executable name if we are creating a manifest
    let mut entry_point = "Game.exe".to_string();
    
    // Try to find the actual executable in the folder
    if let Ok(entries) = fs::read_dir(&game_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if let Some(ext) = path.extension() {
                    if ext.to_string_lossy().to_lowercase() == "exe" {
                        if let Some(name) = path.file_name() {
                            entry_point = name.to_string_lossy().to_string();
                            // Prefer the one matching game_id or folder_name if possible, but taking first one is safer than "Game.exe"
                            if entry_point.contains(&folder_name) || entry_point.contains(&game_id) {
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    if !manifest_path.exists() {
        // Create a basic manifest if missing
        let manifest_json = serde_json::json!({
            "id": game_id,
            "name": game_name,
            "version": "1.0.0",
            "executable": entry_point,
            "entryPoint": entry_point,
            "files": file_hashes
        });
        
        // Write pretty printed JSON
        let manifest_content = serde_json::to_string_pretty(&manifest_json).map_err(|e| e.to_string())?;
        let mut m_file = fs::File::create(&manifest_path).map_err(|e| e.to_string())?;
        m_file.write_all(manifest_content.as_bytes()).map_err(|e| e.to_string())?;
    } else {
        // If manifest exists (e.g. from zip), we should probably update it with hashes if they are missing
        // For now, let's assume we overwrite or merge if we want to enforce our hashing.
        // But the zip might contain a Better manifest.
        // Strategy: Read existing, update 'files', write back.
        if let Ok(content) = fs::read_to_string(&manifest_path) {
             if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&content) {
                 v["files"] = serde_json::to_value(file_hashes).unwrap_or(serde_json::json!({}));
                 // Also ensure ID is correct just in case
                 if v["id"].is_null() { v["id"] = serde_json::Value::String(game_id.clone()); }
                 
                 let new_content = serde_json::to_string_pretty(&v).unwrap_or(content);
                 let _ = fs::write(&manifest_path, new_content);
             }
        }
    }

    // 4. Create server_config.txt
    let config_path = game_dir.join("server_config.txt");
    // Always overwrite/create to ensure it has the latest URL
    let mut c_file = fs::File::create(&config_path).map_err(|e| e.to_string())?;
    c_file.write_all(backend_url.as_bytes()).map_err(|e| e.to_string())?;

    let _ = window.emit("install:complete", ProgressPayload {
        game_id: game_id.clone(),
        game_name: game_name.clone(),
        progress: 100,
        status: "complete".to_string(),
    });

    Ok(game_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn select_folder() -> Option<String> {
    let folder = rfd::AsyncFileDialog::new().pick_folder().await;
    folder.map(|f| f.path().to_string_lossy().to_string())
}

#[tauri::command]
pub fn uninstall_game(install_path: String, folder_name: String) -> Result<bool, String> {
    let game_dir = Path::new(&install_path).join("Vext").join(folder_name);
    if game_dir.exists() {
        fs::remove_dir_all(game_dir).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn is_game_installed(install_path: String, folder_name: String) -> bool {
    let manifest_path = Path::new(&install_path)
        .join("Vext")
        .join(folder_name)
        .join("manifest.json");
    manifest_path.exists()
}
