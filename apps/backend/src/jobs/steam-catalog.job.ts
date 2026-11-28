import cron from 'node-cron';
import { SteamCatalogService } from '../features/steam-catalog/steam-catalog.service';

const safe = (label: string, fn: () => Promise<any>) =>
    fn()
        .then(r => console.log(`[SteamCatalog] ${label} OK`, r))
        .catch(e => console.error(`[SteamCatalog] ${label}:`, e.message));

// Promos / meilleures ventes : toutes les 6 h
cron.schedule('0 */6 * * *', () => {
    safe('featured', () => SteamCatalogService.syncFeatured());
    safe('charts', () => SteamCatalogService.syncCharts());
    safe('search lists', () => SteamCatalogService.syncSearchLists());
}, { timezone: 'Europe/Paris' });
// Liste complète des jeux : chaque dimanche à 4 h
cron.schedule('0 4 * * 0', () => { safe('app list', () => SteamCatalogService.syncAppList()); }, { timezone: 'Europe/Paris' });

// Au démarrage : remplit la base si elle est vide, sans bloquer le serveur
setTimeout(async () => {
    try {
        const n = await SteamCatalogService.count();
        await safe('featured', () => SteamCatalogService.syncFeatured());
        await safe('charts', () => SteamCatalogService.syncCharts());
        safe('search lists', () => SteamCatalogService.syncSearchLists()); // ~3 min : sans bloquer la suite
        if (n < 1000 && process.env.STEAM_API_KEY) await safe('app list', () => SteamCatalogService.syncAppList());
    } catch (e: any) {
        console.error('[SteamCatalog] init:', e.message);
    }
}, 15000);

// Worker d'enrichissement « SteamDB » : complète les fiches jeu par jeu, en continu et lentement.
// Steam limite appdetails (~200 requêtes / 5 min / IP) : on reste à 1 requête toutes les 2 s (150 / 5 min),
// et on ralentit fortement si Steam répond 429/403. Désactivable avec STEAM_ENRICH=off.
const ENRICH_PACE_MS = 2000;
let backoffMs = 5 * 60 * 1000;

async function enrichLoop() {
    for (;;) {
        let delay = ENRICH_PACE_MS;
        try {
            // 1) prix en masse (50 jeux / requête), 2) fiches détaillées jeu par jeu
            const more = (await SteamCatalogService.priceBatch()) || (await SteamCatalogService.enrichNext());
            if (!more) delay = 60 * 60 * 1000; // tout est à jour : on revérifie dans une heure
            backoffMs = 5 * 60 * 1000;
        } catch (e: any) {
            if (/429|403/.test(String(e.message))) {
                console.warn(`[SteamCatalog] limite de débit Steam, pause ${Math.round(backoffMs / 60000)} min`);
                delay = backoffMs;
                backoffMs = Math.min(backoffMs * 2, 30 * 60 * 1000);
            } else {
                console.warn(`[SteamCatalog] enrich: ${e.message}`);
                delay = 10_000;
            }
        }
        await new Promise(r => setTimeout(r, delay));
    }
}

// Passe de fond des visuels (posters portrait, bannières) : 100 jeux par requête, indépendante du worker prix/fiches
async function assetsLoop() {
    for (;;) {
        let delay = ENRICH_PACE_MS;
        try {
            if (!(await SteamCatalogService.assetBatch())) delay = 60 * 60 * 1000;
        } catch (e: any) {
            console.warn(`[SteamCatalog] assets: ${e.message}`);
            delay = /429|403/.test(String(e.message)) ? 10 * 60 * 1000 : 15_000;
        }
        await new Promise(r => setTimeout(r, delay));
    }
}

if (process.env.STEAM_ENRICH !== 'off') {
    setTimeout(() => { assetsLoop(); }, 90_000);
    // Démarre après la synchro initiale de la liste
    setTimeout(() => { enrichLoop(); }, 60_000);
}

console.log('✅ Steam catalog jobs scheduled');
