// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod epic;
mod installation;
mod launcher;
mod steam;
mod updater;

use epic::{scan_epic_games, launch_epic_game, install_epic_game, uninstall_epic_game};
use installation::{install_game, uninstall_game, is_game_installed, select_folder};
use launcher::launch_game;
use steam::{scan_steam_games, launch_steam_game, install_steam_game, uninstall_steam_game, open_external_url};
use updater::{check_for_update, download_and_install_update};

fn main() {
    // Ignore SSL certificate errors for local development and custom hosts
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--ignore-certificate-errors");

    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Afficher et focaliser la fenetre principale une fois WebView2 pret
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                    let _ = w.show();
                    let _ = w.set_focus();
                });
            }

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let mut tray_builder = TrayIconBuilder::with_id("vext-tray")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            if let Err(err) = tray_builder.build(app) {
                eprintln!("[VEXT] Warning: Tray icon could not be registered: {}", err);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            install_game,
            uninstall_game,
            is_game_installed,
            launch_game,
            select_folder,
            scan_steam_games,
            launch_steam_game,
            install_steam_game,
            uninstall_steam_game,
            open_external_url,
            scan_epic_games,
            launch_epic_game,
            install_epic_game,
            uninstall_epic_game,
            check_for_update,
            download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
