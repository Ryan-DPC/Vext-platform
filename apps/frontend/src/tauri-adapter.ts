import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface SteamAccount {
    steam_id: string;
    display_name: string;
    avatar_url: string;
}

export interface SteamGameItem {
    id: string;
    app_id: string;
    name: string;
    platform: string;
    folder_name: string;
    install_path: string;
    image_url: string;
    hero_url: string;
    launch_url: string;
    installed: boolean;
    genre: string;
}

export interface EpicGameItem {
    id: string;
    app_name: string;
    name: string;
    platform: string;
    folder_name: string;
    install_path: string;
    launch_executable: string;
    image_url: string;
    hero_url: string;
    launch_url: string;
    installed: boolean;
    genre: string;
}

export interface UpdateInfo {
    version: string;
    current_version: string;
    body?: string;
    date?: string;
}

// Define the interface match existing usage if possible, or just strict typing
interface TauriAPI {
    selectFolder: () => Promise<string | null>;
    installGame: (downloadUrl: string, installPath: string, folderName: string, gameId: string, gameName: string, version: string, manifest: any) => Promise<any>;
    checkGameInstalled: (installPath: string, folderName: string) => Promise<boolean>;
    uninstallGame: (installPath: string, folderName: string) => Promise<boolean>;
    launchGame: (installPath: string, folderName: string, userData: any) => Promise<any>;
    scanSteamGames: () => Promise<SteamGameItem[]>;
    launchSteamGame: (appId: string) => Promise<string>;
    installSteamGame: (appId: string, name?: string) => Promise<string>;
    uninstallSteamGame: (appId: string) => Promise<string>;
    steamInstallProgress: (appId: string) => Promise<{ state: string; progress: number; downloaded: number; total: number }>;
    openExternalUrl: (url: string) => Promise<string>;
    scanEpicGames: () => Promise<EpicGameItem[]>;
    launchEpicGame: (appName: string) => Promise<string>;
    installEpicGame: (appName: string) => Promise<string>;
    uninstallEpicGame: (appName: string) => Promise<string>;
    checkForUpdate: () => Promise<UpdateInfo | null>;
    downloadAndInstallUpdate: () => Promise<void>;
    onUpdateProgress: (callback: (data: { downloaded: number; total: number; percentage: number }) => void) => void;
    onInstallProgress: (callback: (data: any) => void) => void;
    onInstallComplete: (callback: (data: any) => void) => void;
    onInstallError: (callback: (data: any) => void) => void;
    onGameStatus: (callback: (data: any) => void) => void;
    onGameExited: (callback: (data: any) => void) => void;
    // Steam Account & OpenID
    getSteamApiKey: () => Promise<string | null>;
    setSteamApiKey: (key: string) => Promise<void>;
    getSteamAccount: () => Promise<SteamAccount | null>;
    disconnectSteamAccount: () => Promise<void>;
    steamOpenIdLogin: () => Promise<string>;
    fetchSteamOwnedGames: (steamId: string, apiKey: string) => Promise<SteamGameItem[]>;
}

const tauriAPI: TauriAPI = {
    // ... existing methods ...
    selectFolder: async () => {
        if (!(window as any).__TAURI_INTERNALS__) return null;
        try {
            const selected = await invoke('select_folder');
            return selected as string | null;
        } catch (e) {
            console.warn('Tauri invoke failed:', e);
            return null;
        }
    },

    installGame: async (downloadUrl, installPath, folderName, gameId, gameName, _version, _manifest) => {
        if (!(window as any).__TAURI_INTERNALS__) throw new Error('Not running in Tauri');
        try {
            return await invoke('install_game', {
                downloadUrl,
                installPath,
                folderName,
                gameId,
                gameName
            });
        } catch (e: any) {
            throw e;
        }
    },

    checkGameInstalled: (installPath, folderName) => {
        if (!(window as any).__TAURI_INTERNALS__) return Promise.resolve(false);
        return invoke('is_game_installed', { installPath, folderName });
    },

    uninstallGame: (installPath, folderName) => {
        if (!(window as any).__TAURI_INTERNALS__) return Promise.resolve(false);
        return invoke('uninstall_game', { installPath, folderName });
    },

    launchGame: (installPath, folderName, userData) => {
        if (!(window as any).__TAURI_INTERNALS__) return Promise.reject('Not running in Tauri');
        return invoke('launch_game', { installPath, folderName, userData });
    },

    scanSteamGames: async () => {
        if (!(window as any).__TAURI_INTERNALS__) {
            // Mode aperçu navigateur : retourne les vrais jeux détectés sur le PC
            return [
                {
                    id: 'steam_2651280',
                    app_id: '2651280',
                    name: "Marvel's Spider-Man 2",
                    platform: 'steam',
                    folder_name: "Marvel's Spider-Man 2",
                    install_path: "D:\\SteamLibrary\\steamapps\\common\\Marvel's Spider-Man 2",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2651280/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2651280/library_hero.jpg',
                    launch_url: 'steam://run/2651280',
                    installed: true,
                    genre: 'Steam'
                },
                {
                    id: 'steam_1817190',
                    app_id: '1817190',
                    name: "Marvel's Spider-Man: Miles Morales",
                    platform: 'steam',
                    folder_name: "Marvel's Spider-Man: Miles Morales",
                    install_path: "D:\\SteamLibrary\\steamapps\\common\\Marvel's Spider-Man: Miles Morales",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1817190/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1817190/library_hero.jpg',
                    launch_url: 'steam://run/1817190',
                    installed: true,
                    genre: 'Steam'
                },
                {
                    id: 'steam_2878980',
                    app_id: '2878980',
                    name: "NBA 2K25",
                    platform: 'steam',
                    folder_name: "NBA 2K25",
                    install_path: "D:\\SteamLibrary\\steamapps\\common\\NBA 2K25",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2878980/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2878980/library_hero.jpg',
                    launch_url: 'steam://run/2878980',
                    installed: true,
                    genre: 'Steam'
                },
                {
                    id: 'steam_2358720',
                    app_id: '2358720',
                    name: "Black Myth: Wukong",
                    platform: 'steam',
                    folder_name: "Black Myth Wukong",
                    install_path: "D:\\SteamLibrary\\steamapps\\common\\Black Myth Wukong",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/library_hero.jpg',
                    launch_url: 'steam://run/2358720',
                    installed: true,
                    genre: 'Steam'
                },
                {
                    id: 'steam_271590',
                    app_id: '271590',
                    name: "Grand Theft Auto V",
                    platform: 'steam',
                    folder_name: "Grand Theft Auto V",
                    install_path: "D:\\SteamLibrary\\steamapps\\common\\Grand Theft Auto V",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/271590/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/271590/library_hero.jpg',
                    launch_url: 'steam://run/271590',
                    installed: true,
                    genre: 'Steam'
                },
                {
                    id: 'steam_367520',
                    app_id: '367520',
                    name: "Hollow Knight",
                    platform: 'steam',
                    folder_name: "Hollow Knight",
                    install_path: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Hollow Knight",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/library_hero.jpg',
                    launch_url: 'steam://run/367520',
                    installed: true,
                    genre: 'Steam'
                },
                {
                    id: 'steam_4000',
                    app_id: '4000',
                    name: "Garry's Mod",
                    platform: 'steam',
                    folder_name: "GarrysMod",
                    install_path: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\GarrysMod",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4000/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4000/library_hero.jpg',
                    launch_url: 'steam://run/4000',
                    installed: true,
                    genre: 'Steam'
                },
                {
                    id: 'steam_550',
                    app_id: '550',
                    name: "Left 4 Dead 2",
                    platform: 'steam',
                    folder_name: "Left 4 Dead 2",
                    install_path: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Left 4 Dead 2",
                    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/550/library_600x900.jpg',
                    hero_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/550/library_hero.jpg',
                    launch_url: 'steam://run/550',
                    installed: true,
                    genre: 'Steam'
                }
            ];
        }
        try {
            return (await invoke('scan_steam_games')) as SteamGameItem[];
        } catch (e) {
            console.warn('scan_steam_games failed:', e);
            return [];
        }
    },

    launchSteamGame: async (appId: string) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            window.location.href = `steam://run/${appId}`;
            return `Launched steam://run/${appId}`;
        }
        return (await invoke('launch_steam_game', { appId, app_id: appId })) as string;
    },

    installSteamGame: async (appId: string, name?: string) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            window.location.href = `steam://install/${appId}`;
            return `Triggered steam://install/${appId}`;
        }
        return (await invoke('install_steam_game', { appId, app_id: appId, name })) as string;
    },

    steamInstallProgress: async (appId: string) => {
        if (!(window as any).__TAURI_INTERNALS__) return { state: 'missing', progress: 0, downloaded: 0, total: 0 };
        return (await invoke('steam_install_progress', { appId, app_id: appId })) as any;
    },

    uninstallSteamGame: async (appId: string) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            window.location.href = `steam://uninstall/${appId}`;
            return `Triggered steam://uninstall/${appId}`;
        }
        return (await invoke('uninstall_steam_game', { appId, app_id: appId })) as string;
    },

    openExternalUrl: async (url: string) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            window.open(url, '_blank', 'noopener');
            return `Opened ${url}`;
        }
        return (await invoke('open_external_url', { url })) as string;
    },

    scanEpicGames: async () => {
        if (!(window as any).__TAURI_INTERNALS__) {
            return [];
        }
        try {
            return (await invoke('scan_epic_games')) as EpicGameItem[];
        } catch (e) {
            console.warn('scan_epic_games failed:', e);
            return [];
        }
    },

    launchEpicGame: async (appName: string) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            window.location.href = `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`;
            return `Launched Epic ${appName}`;
        }
        return (await invoke('launch_epic_game', { appName, app_name: appName })) as string;
    },

    installEpicGame: async (appName: string) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            window.location.href = `com.epicgames.launcher://apps/${appName}?action=install`;
            return `Triggered Epic install ${appName}`;
        }
        return (await invoke('install_epic_game', { appName, app_name: appName })) as string;
    },

    uninstallEpicGame: async (appName: string) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            window.location.href = `com.epicgames.launcher://apps/${appName}?action=uninstall`;
            return `Triggered Epic uninstall ${appName}`;
        }
        return (await invoke('uninstall_epic_game', { appName, app_name: appName })) as string;
    },

    checkForUpdate: async () => {
        if (!(window as any).__TAURI_INTERNALS__) return null;
        try {
            return (await invoke('check_for_update')) as UpdateInfo | null;
        } catch (e) {
            console.warn('check_for_update failed:', e);
            return null;
        }
    },

    downloadAndInstallUpdate: async () => {
        if (!(window as any).__TAURI_INTERNALS__) throw new Error('Not running in Tauri');
        return await invoke('download_and_install_update');
    },

    onUpdateProgress: (callback) => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        listen('update-progress', (event: any) => {
            callback(event.payload);
        }).catch(e => console.warn('Failed to listen to update-progress', e));
    },

    onInstallProgress: (callback) => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        listen('install:progress', (event: any) => {
            callback(event.payload);
        }).catch(e => console.warn('Failed to listen to install:progress', e));
    },
    onInstallComplete: (callback) => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        listen('install:complete', (event: any) => {
            callback(event.payload);
        }).catch(e => console.warn('Failed to listen to install:complete', e));
    },
    onInstallError: (callback) => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        listen('install:error', (event: any) => {
            callback(event.payload);
        }).catch(e => console.warn('Failed to listen to install:error', e));
    },
    onGameStatus: (callback) => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        listen('game:status', (event: any) => {
            callback(event.payload);
        }).catch(e => console.warn('Failed to listen to game:status', e));
    },
    onGameExited: (callback) => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        listen('game:exited', (event: any) => {
            callback(event.payload);
        }).catch(e => console.warn('Failed to listen to game:exited', e));
    },

    // ── Steam Account & OpenID ──────────────────────────────────────────────

    getSteamApiKey: async () => {
        if (!(window as any).__TAURI_INTERNALS__) return null;
        try {
            return (await invoke('get_steam_api_key')) as string | null;
        } catch {
            return null;
        }
    },

    setSteamApiKey: async (key: string) => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        await invoke('set_steam_api_key', { key });
    },

    getSteamAccount: async () => {
        if (!(window as any).__TAURI_INTERNALS__) return null;
        try {
            return (await invoke('get_steam_account')) as SteamAccount | null;
        } catch {
            return null;
        }
    },

    disconnectSteamAccount: async () => {
        if (!(window as any).__TAURI_INTERNALS__) return;
        await invoke('disconnect_steam_account');
    },

    steamOpenIdLogin: async () => {
        if (!(window as any).__TAURI_INTERNALS__) {
            // Simuler en mode navigateur (dev uniquement)
            return '76561198000000000';
        }
        return (await invoke('steam_openid_login')) as string;
    },

    fetchSteamOwnedGames: async (steamId: string, apiKey: string) => {
        if (!(window as any).__TAURI_INTERNALS__) return [];
        try {
            return (await invoke('fetch_steam_owned_games', { steamId, apiKey })) as SteamGameItem[];
        } catch (e) {
            console.warn('fetch_steam_owned_games failed:', e);
            return [];
        }
    },
};

export default tauriAPI;

