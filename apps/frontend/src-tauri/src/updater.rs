use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Commande Tauri : Vérifie si une mise à jour est disponible
#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => return Err(format!("Erreur d'initialisation updater: {}", e)),
    };

    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => return Ok(None),
        Err(e) => return Err(format!("Erreur lors de la recherche de mise à jour: {}", e)),
    };

    Ok(Some(UpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        body: update.body.clone(),
        date: update.date.map(|d| d.to_string()),
    }))
}

/// Commande Tauri : Télécharge et installe la mise à jour avec émission de progression
#[tauri::command]
pub async fn download_and_install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Aucune mise à jour disponible".to_string())?;

    let mut downloaded = 0;
    let app_handle = app.clone();

    let bytes = update
        .download(
            move |chunk_len, total_len| {
                downloaded += chunk_len;
                let _ = app_handle.emit(
                    "update-progress",
                    serde_json::json!({
                        "downloaded": downloaded,
                        "total": total_len.unwrap_or(0),
                        "percentage": total_len.map(|t| ((downloaded as f64 / t as f64) * 100.0) as u32).unwrap_or(0)
                    }),
                );
            },
            || {
                // Download finished
            },
        )
        .await
        .map_err(|e| format!("Erreur lors du téléchargement: {}", e))?;

    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    update
        .install(bytes)
        .map_err(|e| format!("Erreur lors de l'installation de la mise à jour: {}", e))?;

    Ok(())
}
