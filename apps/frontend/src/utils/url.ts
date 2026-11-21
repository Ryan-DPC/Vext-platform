export const getApiUrl = () => {
    let url = import.meta.env.VITE_API_URL;
    if (url && !url.includes('onrender.com')) return url;
    return 'https://hoopslive.ch/vext';
}
