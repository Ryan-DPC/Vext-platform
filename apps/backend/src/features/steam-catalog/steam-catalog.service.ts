import { SteamApp } from './steam-catalog.model';

const STORE = 'https://store.steampowered.com';
const API = 'https://api.steampowered.com';
const DETAILS_TTL_MS = 24 * 60 * 60 * 1000;
const COUNTRIES = ['ch', 'fr', 'us'];
const DEFAULT_CC = 'ch';
const FEATURED_LISTS = ['top_sellers', 'specials', 'new_releases', 'coming_soon'] as const;

const cleanCc = (cc?: string) => (cc && COUNTRIES.includes(cc) ? cc : DEFAULT_CC);

async function getJson(url: string, timeoutMs = 20000): Promise<any> {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Steam HTTP ${res.status}`);
    return res.json();
}

const fmt = (cents: number | undefined, currency: string) =>
    typeof cents === 'number' ? `${(cents / 100).toFixed(2)} ${currency}` : undefined;

const assetBase = (appid: number) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}`;

export const toPublic = (d: any) => ({
    appid: d.appid,
    name: d.name,
    is_free: !!d.is_free,
    price: d.price || null,
    short_description: d.short_description || '',
    genres: d.genres || [],
    release_date: d.release_date || '',
    image_url: d.header_image || `${assetBase(d.appid)}/header.jpg`,
    poster_url: `${assetBase(d.appid)}/library_600x900.jpg`,
    store_url: `${STORE}/app/${d.appid}`
});

export class SteamCatalogService {
    private static syncing = { appList: false, featured: false };

    /** Liste complète des jeux Steam (noms uniquement) — nécessite STEAM_API_KEY. */
    static async syncAppList(): Promise<{ total: number }> {
        const key = process.env.STEAM_API_KEY;
        if (!key) throw new Error('STEAM_API_KEY non défini');
        if (this.syncing.appList) throw new Error('Synchronisation déjà en cours');
        this.syncing.appList = true;
        let total = 0;
        try {
            let last = 0;
            for (;;) {
                const url = `${API}/IStoreService/GetAppList/v1/?key=${encodeURIComponent(key)}&max_results=50000&last_appid=${last}` +
                    `&include_games=true&include_dlc=false&include_software=false&include_videos=false&include_hardware=false`;
                const data = await getJson(url, 60000);
                const apps: any[] = data?.response?.apps || [];
                const ops = apps
                    .filter(a => a?.appid && a?.name && String(a.name).trim())
                    .map(a => ({
                        updateOne: {
                            filter: { appid: a.appid },
                            update: { $set: { name: String(a.name), name_lower: String(a.name).toLowerCase() } },
                            upsert: true
                        }
                    }));
                if (ops.length) await SteamApp.bulkWrite(ops, { ordered: false });
                total += ops.length;
                if (!data?.response?.have_more_results || !data.response.last_appid) break;
                last = data.response.last_appid;
            }
            return { total };
        } finally {
            this.syncing.appList = false;
        }
    }

    /** Mises en avant (meilleures ventes, promos, nouveautés) avec prix, en un seul appel. */
    static async syncFeatured(cc = DEFAULT_CC): Promise<{ total: number }> {
        if (this.syncing.featured) throw new Error('Synchronisation déjà en cours');
        this.syncing.featured = true;
        try {
            const data = await getJson(`${STORE}/api/featuredcategories?cc=${cleanCc(cc)}&l=french`);

            const merged = new Map<number, { item: any; lists: Set<string>; rank: number }>();
            for (const list of FEATURED_LISTS) {
                const items: any[] = data?.[list]?.items || [];
                items.forEach((item, i) => {
                    if (!item?.id || !item?.name) return;
                    const m = merged.get(item.id) || { item, lists: new Set<string>(), rank: i };
                    m.lists.add(list);
                    m.rank = Math.min(m.rank, i);
                    merged.set(item.id, m);
                });
            }
            if (merged.size === 0) return { total: 0 }; // réponse vide : on garde les anciennes listes

            // On remet les listes à zéro seulement quand on a de nouvelles données
            await SteamApp.updateMany({ featured: { $ne: [] } }, { $set: { featured: [], featured_rank: 9999 } });

            const ops = [...merged.values()].map(({ item, lists, rank }) => {
                const currency = item.currency || 'CHF';
                const free = !item.final_price && !item.original_price;
                return {
                    updateOne: {
                        filter: { appid: item.id },
                        update: {
                            $set: {
                                name: String(item.name), name_lower: String(item.name).toLowerCase(),
                                featured: [...lists], featured_rank: rank,
                                ...(item.header_image ? { header_image: item.header_image } : {}),
                                is_free: free,
                                price: free ? null : {
                                    currency,
                                    initial: item.original_price ?? item.final_price,
                                    final: item.final_price,
                                    discount_percent: item.discount_percent || 0,
                                    initial_formatted: fmt(item.original_price ?? item.final_price, currency),
                                    final_formatted: fmt(item.final_price, currency)
                                },
                                price_fetched_at: new Date()
                            }
                        },
                        upsert: true
                    }
                };
            });
            await SteamApp.bulkWrite(ops, { ordered: false });
            return { total: ops.length };
        } finally {
            this.syncing.featured = false;
        }
    }

    /**
     * Récupère et enregistre la fiche complète d'un jeu (un appel appdetails).
     * Lève une erreur « Steam HTTP 429/403 » si Steam limite le débit (le worker ralentit alors).
     */
    static async enrich(appid: number, cc = DEFAULT_CC): Promise<any | null> {
        const data = await getJson(`${STORE}/api/appdetails?appids=${appid}&cc=${cleanCc(cc)}&l=french`);
        const entry = data?.[appid];
        const now = new Date();
        if (!entry?.success || !entry.data) {
            // Jeu retiré / restreint dans cette région : on le note pour ne pas le redemander en boucle
            return SteamApp.findOneAndUpdate(
                { appid },
                { $set: { unavailable_at: now, details_fetched_at: now } },
                { new: true }
            ).lean();
        }
        const d = entry.data;
        const po = d.price_overview;
        const set: any = {
            name: d.name, name_lower: String(d.name).toLowerCase(),
            type: d.type,
            is_free: !!d.is_free,
            short_description: d.short_description || '',
            ...(d.header_image ? { header_image: d.header_image } : {}),
            ...(d.capsule_image ? { capsule_image: d.capsule_image } : {}),
            genres: (d.genres || []).map((g: any) => g.description),
            developers: d.developers || [],
            publishers: d.publishers || [],
            platforms: d.platforms ? { windows: !!d.platforms.windows, mac: !!d.platforms.mac, linux: !!d.platforms.linux } : undefined,
            metacritic: d.metacritic?.score,
            recommendations: d.recommendations?.total,
            release_date: d.release_date?.date || '',
            price: po ? {
                currency: po.currency, initial: po.initial, final: po.final,
                discount_percent: po.discount_percent,
                initial_formatted: po.initial_formatted || po.final_formatted,
                final_formatted: po.final_formatted
            } : null,
            price_fetched_at: now,
            details_fetched_at: now,
            unavailable_at: null
        };
        return SteamApp.findOneAndUpdate({ appid }, { $set: set }, { upsert: true, new: true }).lean();
    }

    /** Détails + prix d'un jeu (à la demande, mis en cache 24 h). */
    static async getApp(appid: number, cc = DEFAULT_CC) {
        let doc: any = await SteamApp.findOne({ appid }).lean();
        const fresh = doc?.details_fetched_at && Date.now() - new Date(doc.details_fetched_at).getTime() < DETAILS_TTL_MS;
        if (fresh) return doc;
        try {
            doc = (await this.enrich(appid, cc)) || doc;
        } catch (e: any) {
            console.warn(`[SteamCatalog] appdetails ${appid}: ${e.message}`);
        }
        return doc;
    }

    /**
     * Un pas du worker d'enrichissement : choisit le prochain jeu à compléter
     * (jamais récupéré en premier, les plus récents d'abord ; puis les fiches périmées) et le met à jour.
     * Retourne false quand il n'y a plus rien à faire.
     */
    static async enrichNext(): Promise<boolean> {
        const WEEK = 7 * 24 * 3600 * 1000;
        const MONTH = 30 * 24 * 3600 * 1000;
        let target: any = await SteamApp.findOne({ details_fetched_at: null }).sort({ appid: -1 }).select('appid').lean();
        if (!target) {
            target = await SteamApp.findOne({
                $or: [
                    { unavailable_at: null, details_fetched_at: { $lt: new Date(Date.now() - WEEK) } },
                    { unavailable_at: { $ne: null }, details_fetched_at: { $lt: new Date(Date.now() - MONTH) } }
                ]
            }).sort({ details_fetched_at: 1 }).select('appid').lean();
        }
        if (!target) return false;
        await this.enrich(target.appid);
        return true;
    }

    static async stats() {
        const [total, enriched, unavailable] = await Promise.all([
            SteamApp.estimatedDocumentCount(),
            SteamApp.countDocuments({ details_fetched_at: { $ne: null }, unavailable_at: null }),
            SteamApp.countDocuments({ unavailable_at: { $ne: null } })
        ]);
        return { total, enriched, unavailable, remaining: Math.max(total - enriched - unavailable, 0) };
    }

    static async featured() {
        const out: Record<string, any[]> = {};
        for (const list of FEATURED_LISTS) {
            const docs = await SteamApp.find({ featured: list }).sort({ featured_rank: 1 }).limit(24).lean();
            out[list] = docs.map(toPublic);
        }
        return out;
    }

    static async search(q: string, limit = 24) {
        const term = q.trim().toLowerCase().slice(0, 80);
        if (term.length < 2) return [];
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const max = Math.min(Math.max(limit, 1), 50);
        const docs: any[] = await SteamApp.find({ name_lower: { $regex: escaped } })
            .sort({ featured_rank: 1, name_lower: 1 })
            .limit(400)
            .lean();
        // Pertinence : correspondance exacte, puis nom commençant par le terme, puis mises en avant, puis nom court
        const score = (d: any) =>
            (d.name_lower === term ? 0 : d.name_lower.startsWith(term) ? 1 : 2) * 1e6 +
            (d.featured_rank ?? 9999) * 100 + Math.min(d.name_lower.length, 99);
        const top = docs.sort((a, b) => score(a) - score(b)).slice(0, max);
        await this.fillPrices(top);
        return top.map(toPublic);
    }

    /** Récupère en un seul appel les prix des jeux dont on n'a pas encore le prix (max 20, échec silencieux). */
    private static async fillPrices(docs: any[], cc = DEFAULT_CC) {
        const missing = docs.filter(d => !d.price_fetched_at).slice(0, 20);
        if (missing.length === 0) return;
        try {
            const ids = missing.map(d => d.appid).join(',');
            const data = await getJson(`${STORE}/api/appdetails?appids=${ids}&cc=${cleanCc(cc)}&filters=price_overview`, 8000);
            const ops: any[] = [];
            for (const d of missing) {
                const entry = data?.[d.appid];
                if (!entry?.success) continue; // jeu indisponible dans cette région : on réessaiera plus tard
                const po = entry.data?.price_overview;
                d.price = po ? {
                    currency: po.currency, initial: po.initial, final: po.final,
                    discount_percent: po.discount_percent,
                    initial_formatted: po.initial_formatted || po.final_formatted,
                    final_formatted: po.final_formatted
                } : null;
                // Sans price_overview on ne sait pas distinguer « gratuit » de « pas encore en vente » : on n'affirme rien
                d.price_fetched_at = new Date();
                ops.push({ updateOne: { filter: { appid: d.appid }, update: { $set: { price: d.price, price_fetched_at: d.price_fetched_at } } } });
            }
            if (ops.length) await SteamApp.bulkWrite(ops, { ordered: false });
        } catch (e: any) {
            console.warn(`[SteamCatalog] fillPrices: ${e.message}`);
        }
    }

    static async count() {
        return SteamApp.estimatedDocumentCount();
    }
}
