import cron from 'node-cron';
import { SteamCatalogService } from '../features/steam-catalog/steam-catalog.service';

const safe = (label: string, fn: () => Promise<any>) =>
    fn()
        .then(r => console.log(`[SteamCatalog] ${label} OK`, r))
        .catch(e => console.error(`[SteamCatalog] ${label}:`, e.message));

// Promos / meilleures ventes : toutes les 6 h
cron.schedule('0 */6 * * *', () => { safe('featured', () => SteamCatalogService.syncFeatured()); }, { timezone: 'Europe/Paris' });
// Liste complète des jeux : chaque dimanche à 4 h
cron.schedule('0 4 * * 0', () => { safe('app list', () => SteamCatalogService.syncAppList()); }, { timezone: 'Europe/Paris' });

// Au démarrage : remplit la base si elle est vide, sans bloquer le serveur
setTimeout(async () => {
    try {
        const n = await SteamCatalogService.count();
        await safe('featured', () => SteamCatalogService.syncFeatured());
        if (n < 1000 && process.env.STEAM_API_KEY) await safe('app list', () => SteamCatalogService.syncAppList());
    } catch (e: any) {
        console.error('[SteamCatalog] init:', e.message);
    }
}, 15000);

console.log('✅ Steam catalog jobs scheduled');
