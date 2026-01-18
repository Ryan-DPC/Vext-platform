use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::io::{Read, BufReader};
use sha2::{Sha256, Digest};
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Manifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub executable: String,
    #[serde(rename = "entryPoint")]
    pub entry_point: String,
    #[serde(default)]
    pub files: HashMap<String, String>, // relative_path -> sha256_hash
}

/// Calculates SHA256 hash of a file
pub fn calculate_file_hash(path: &Path) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0; 4096];

    loop {
        let count = reader.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    Ok(hex::encode(hasher.finalize()))
}

/// Generates a map of relative paths to hashes for a directory
pub fn generate_dir_hashes(root: &Path) -> Result<HashMap<String, String>, String> {
    let mut hashes = HashMap::new();

    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            // Skip the manifest itself and config files to avoid circular dependency or changing check issues
            if path.file_name().and_then(|n| n.to_str()).map_or(false, |s| s == "manifest.json" || s == "server_config.txt") {
                continue;
            }

            if let Ok(hash) = calculate_file_hash(path) {
                if let Ok(rel_path) = path.strip_prefix(root) {
                    // Normalize path separators to forward slashes for consistency
                    let rel_str = rel_path.to_string_lossy().replace("\\", "/");
                    hashes.insert(rel_str, hash);
                }
            }
        }
    }

    Ok(hashes)
}

#[tauri::command]
pub async fn verify_game_integrity(install_path: String, folder_name: String) -> Result<Vec<String>, String> {
    let game_dir = Path::new(&install_path).join("Vext").join(&folder_name);
    let manifest_path = game_dir.join("manifest.json");

    if !manifest_path.exists() {
        return Err("Manifest not found".to_string());
    }

    let manifest_str = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: Manifest = serde_json::from_str(&manifest_str).map_err(|e| e.to_string())?;

    let mut corrupted_files = Vec::new();

    for (rel_path, expected_hash) in &manifest.files {
        let file_path = game_dir.join(rel_path);
        
        if !file_path.exists() {
            corrupted_files.push(rel_path.clone());
            continue;
        }

        match calculate_file_hash(&file_path) {
            Ok(current_hash) => {
                if current_hash != *expected_hash {
                    corrupted_files.push(rel_path.clone());
                }
            },
            Err(_) => {
                corrupted_files.push(rel_path.clone());
            }
        }
    }

    Ok(corrupted_files)
}
