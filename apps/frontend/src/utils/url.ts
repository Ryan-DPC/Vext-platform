export const getApiUrl = () => {
    let url = import.meta.env.VITE_API_URL;
    const isTauri = !!(window as any).__TAURI__;
    const isElectron = !!(window as any).electronAPI;

    if (isTauri || isElectron) {
        // Force HTTPS for localhost on desktop
        if (url && url.includes('localhost') && url.startsWith('http://')) {
            return url.replace('http://', 'https://');
        }
        if (!url) {
            return 'https://localhost:3001';
        }
    }

    if (url) return url;
    return ''; // Relative path for web
}
