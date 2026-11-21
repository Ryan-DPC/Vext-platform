export const getApiUrl = () => {
    let url = import.meta.env.VITE_API_URL;
    const isTauri = !!(window as any).__TAURI__;

    if (isTauri) {
        if (!url) {
            return 'https://hoopslive.ch/vext';
        }
    }

    if (url) return url;
    return 'https://hoopslive.ch/vext'; // Default to production instead of relative/empty
}
