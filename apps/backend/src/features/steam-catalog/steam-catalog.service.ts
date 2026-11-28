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


function decodeEntities(s: string): string {
    return s
        .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'");
}

/** Extrait appid, titre, date, avis et gratuité des lignes HTML de /search/results (langue anglaise). */
function parseSearchRows(html: string) {
    const rows = html.split(/(?=<a href="https:\/\/store\.steampowered\.com\/app\/)/).slice(1);
    const out: { appid: number; name: string; reviewPercent: number | null; reviewCount: number | null; releasedAt: Date | null; isFree: boolean }[] = [];
    for (const row of rows) {
        const appid = Number(/data-ds-appid="(\d+)"/.exec(row)?.[1]);
        const name = decodeEntities(/<span class="title">([\s\S]*?)<\/span>/.exec(row)?.[1] || '').trim();
        if (!appid || !name) continue;
        const rev = /([\d.]+)% of the ([\d,]+) user reviews/.exec(decodeEntities(/data-tooltip-html="([^"]*)"/.exec(row)?.[1] || ''));
        const dateText = /<div class="search_released[^>]*>\s*([^<]*?)\s*<\/div>/.exec(row)?.[1]?.trim() || '';
        const date = dateText ? new Date(`${dateText} UTC`) : null;
        out.push({
            appid, name,
            reviewPercent: rev ? Number(rev[1]) : null,
            reviewCount: rev ? Number(rev[2].replace(/,/g, '')) : null,
            releasedAt: date && !isNaN(date.getTime()) ? date : null,
            isFree: /discount_final_price free/.test(row)
        });
    }
    return out;
}

export const toPublic = (d: any) => ({
    appid: d.appid,
    name: d.name,
    is_free: !!d.is_free,
    price: d.price || null,
    short_description: d.short_description || '',
    review_percent: d.review_percent ?? null,
    review_count: d.review_count ?? null,
    genres: d.genres || [],
    release_date: d.release_date || '',
    image_url: d.header_image || `${assetBase(d.appid)}/header.jpg`,
    poster_url: d.poster_image || `${assetBase(d.appid)}/library_600x900.jpg`,
    store_url: `${STORE}/app/${d.appid}`
});

export class SteamCatalogService {
    private static syncing = { appList: false, featured: false, lists: false };

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
        const update: any = { $set: set };
        if (typeof d.recommendations?.total === 'number') update.$max = { popularity_score: d.recommendations.total };
        return SteamApp.findOneAndUpdate({ appid }, update, { upsert: true, new: true }).lean();
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

    /**
     * Récupère les vrais visuels (poster portrait 600x900, bannière) de plusieurs jeux en une requête
     * (IStoreBrowseService/GetItems, sans clé). Indispensable pour les jeux récents dont les images
     * ont un chemin à hash que l'on ne peut pas deviner.
     */
    static async fetchAssets(appids: number[]): Promise<number> {
        const ids = [...new Set(appids)].filter(n => Number.isInteger(n) && n > 0).slice(0, 100);
        if (ids.length === 0) return 0;
        const input = {
            ids: ids.map(appid => ({ appid })),
            context: { language: 'english', country_code: 'CH', steam_realm: 1 },
            data_request: { include_assets: true }
        };
        const data = await getJson(`${API}/IStoreBrowseService/GetItems/v1?input_json=${encodeURIComponent(JSON.stringify(input))}`, 30000);
        const now = new Date();
        const byId = new Map<number, any>();
        for (const it of data?.response?.store_items || []) byId.set(it.appid ?? it.id, it);

        const ops = ids.map(appid => {
            const a = byId.get(appid)?.assets;
            const base = a?.asset_url_format
                ? `https://shared.akamai.steamstatic.com/store_item_assets/${String(a.asset_url_format)}`
                : null;
            const url = (file?: string) => (base && file ? base.replace('${FILENAME}', file) : undefined);
            const poster = url(a?.library_capsule_2x) || url(a?.library_capsule);
            const header = url(a?.header);
            const set: any = { assets_fetched_at: now };
            if (poster) set.poster_image = poster;
            if (header) set.header_image = header;
            return { updateOne: { filter: { appid }, update: { $set: set }, upsert: false } };
        });
        await SteamApp.bulkWrite(ops, { ordered: false });
        return ids.length;
    }

    /** Images demandées par l'application (Bibliothèque) : renvoie poster + bannière, en les récupérant si besoin. */
    static async imagesFor(appids: number[]) {
        const ids = [...new Set(appids)].filter(n => Number.isInteger(n) && n > 0).slice(0, 100);
        const WEEK = 7 * 24 * 3600 * 1000;
        let docs: any[] = await SteamApp.find({ appid: { $in: ids } }).select('appid poster_image header_image assets_fetched_at').lean();
        const known = new Set(docs.map(d => d.appid));
        // jeux absents de la base (ex. hors liste) : on crée une fiche minimale pour pouvoir y rattacher leurs visuels
        const missing = ids.filter(id => !known.has(id));
        const stale = docs
            .filter(d => !d.assets_fetched_at || Date.now() - new Date(d.assets_fetched_at).getTime() > WEEK)
            .map(d => d.appid);
        const toFetch = [...stale, ...missing];
        if (toFetch.length) {
            try {
                if (missing.length) {
                    await SteamApp.bulkWrite(missing.map(appid => ({
                        updateOne: { filter: { appid }, update: { $setOnInsert: { appid, name: `App ${appid}`, name_lower: `app ${appid}` } }, upsert: true }
                    })), { ordered: false });
                }
                await this.fetchAssets(toFetch);
                this.fillPlaceholders(missing);
                docs = await SteamApp.find({ appid: { $in: ids } }).select('appid poster_image header_image').lean();
            } catch (e: any) {
                console.warn(`[SteamCatalog] imagesFor: ${e.message}`);
            }
        }
        const out: Record<string, { poster: string; header: string }> = {};
        for (const id of ids) {
            const d = docs.find(x => x.appid === id);
            out[id] = {
                poster: d?.poster_image || `${assetBase(id)}/library_600x900.jpg`,
                header: d?.header_image || `${assetBase(id)}/header.jpg`
            };
        }
        return out;
    }

    /** Passe de fond : complète les visuels de tout le catalogue, 100 jeux par requête. */
    static async assetBatch(size = 100): Promise<boolean> {
        const docs: any[] = await SteamApp.find({ assets_fetched_at: null }).sort({ appid: -1 }).limit(size).select('appid').lean();
        if (docs.length === 0) return false;
        await this.fetchAssets(docs.map(d => d.appid));
        return true;
    }

    /** Complète en arrière-plan (1 requête / 2 s) le nom des jeux créés avec un nom provisoire « App N ». */
    static fillPlaceholders(appids: number[]) {
        const ids = [...new Set(appids)].slice(0, 120);
        if (ids.length === 0) return;
        (async () => {
            for (const id of ids) {
                try {
                    await this.enrich(id);
                } catch (e: any) {
                    if (/429|403/.test(String(e.message))) break;
                }
                await new Promise(r => setTimeout(r, 2000));
            }
        })();
    }

    /** Top 100 des jeux les plus joués en ce moment (ISteamChartsService, sans clé) => classement de popularité. */
    static async syncCharts(): Promise<{ total: number }> {
        const data = await getJson(`${API}/ISteamChartsService/GetMostPlayedGames/v1/`);
        const ranks: any[] = data?.response?.ranks || [];
        if (ranks.length === 0) return { total: 0 };
        // On retire d'abord les anciens scores de classement (>= 1e8) pour ne garder que ceux de la semaine
        await SteamApp.updateMany({ popularity_score: { $gte: 1e8 } }, [{ $set: { popularity_score: { $ifNull: ['$recommendations', 0] } } }]);
        await SteamApp.bulkWrite(ranks.filter(r => r?.appid).map(r => ({
            updateOne: {
                filter: { appid: r.appid },
                update: { $set: { popularity_score: 1e9 - Number(r.rank || 0) }, $setOnInsert: { name: `App ${r.appid}`, name_lower: `app ${r.appid}` } },
                upsert: true
            }
        })), { ordered: false });
        // Les jeux hors de la liste (ex. logiciels) ont un nom provisoire : on récupère leur vraie fiche
        const placeholders = await SteamApp.find({ appid: { $in: ranks.map(r => r.appid) }, name: /^App \d+$/ }).select('appid').lean();
        this.fillPlaceholders(placeholders.map((p: any) => p.appid));
        return { total: ranks.length };
    }

    /**
     * Classements issus de la recherche de la boutique Steam (même source que le site officiel) :
     * meilleures ventes (2000), nouveautés populaires, promotions. Une page = 50 jeux, 1 requête / 2 s.
     * On y lit aussi le % d'avis positifs et le nombre d'avis, ce qui donne le « Top Rated ».
     */
    static async syncSearchLists(): Promise<{ total: number }> {
        if (this.syncing.lists) throw new Error('Synchronisation déjà en cours');
        this.syncing.lists = true;
        let total = 0;
        const lists: { field: 'trend_rank' | 'new_rank' | 'special_rank'; query: string; pages: number }[] = [
            { field: 'trend_rank', query: 'filter=topsellers', pages: 40 },
            { field: 'new_rank', query: 'filter=popularnew', pages: 8 },
            { field: 'special_rank', query: 'specials=1', pages: 20 }
        ];
        try {
            for (const list of lists) {
                const rows: any[] = [];
                for (let page = 0; page < list.pages; page++) {
                    const url = `${STORE}/search/results/?${list.query}&start=${page * 50}&count=50&json=0&infinite=1&category1=998&cc=ch&l=english`;
                    const data = await getJson(url, 30000);
                    const parsed = parseSearchRows(String(data?.results_html || ''));
                    if (parsed.length === 0) break;
                    rows.push(...parsed);
                    await new Promise(r => setTimeout(r, 2000));
                }
                if (rows.length === 0) continue; // réponse vide : on garde les anciens classements

                await SteamApp.updateMany({ [list.field]: { $ne: null } }, { $set: { [list.field]: null } });
                const ops = rows.map((r, i) => {
                    const set: any = { [list.field]: i + 1 };
                    if (r.reviewPercent != null) { set.review_percent = r.reviewPercent; set.review_count = r.reviewCount; }
                    if (r.releasedAt) set.released_at = r.releasedAt;
                    if (r.isFree) set.is_free = true;
                    return {
                        updateOne: {
                            filter: { appid: r.appid },
                            update: { $set: set, $setOnInsert: { appid: r.appid, name: r.name, name_lower: r.name.toLowerCase() } },
                            upsert: true
                        }
                    };
                });
                await SteamApp.bulkWrite(ops, { ordered: false });
                total += rows.length;
            }
            return { total };
        } finally {
            this.syncing.lists = false;
        }
    }

    /** Parcours du catalogue (onglet « Tous les jeux ») avec tri et pagination. */
    static async browse(sort: string, page: number, limit: number) {
        const size = Math.min(Math.max(limit, 1), 60);
        const skip = Math.max(page - 1, 0) * size;
        let filter: any = {};
        let order: any = { appid: -1 };
        switch (sort) {
            case 'trending': filter = { trend_rank: { $gt: 0 } }; order = { trend_rank: 1 }; break;
            case 'new_releases': filter = { new_rank: { $gt: 0 }, released_at: { $gte: new Date(Date.now() - 150 * 86400000), $lte: new Date(Date.now() + 86400000) } }; order = { released_at: -1 }; break;
            case 'promotions': filter = { special_rank: { $gt: 0 } }; order = { special_rank: 1 }; break;
            case 'top_rated': filter = { review_count: { $gte: 20000 }, review_percent: { $gte: 90 } }; order = { review_percent: -1, review_count: -1 }; break;
            case 'free': filter = { is_free: true, trend_rank: { $gt: 0 } }; order = { trend_rank: 1 }; break;
            case 'popular': filter = { popularity_score: { $gt: 0 } }; order = { popularity_score: -1 }; break;
            case 'discount': filter = { 'price.discount_percent': { $gt: 0 } }; order = { 'price.discount_percent': -1 }; break;
            case 'price_low': filter = { 'price.final': { $gt: 0 } }; order = { 'price.final': 1 }; break;
            case 'az': filter = { name_lower: { $regex: '^[a-z]' } }; order = { name_lower: 1 }; break;
            default: filter = { type: 'game' }; order = { appid: -1 };
        }
        const docs = await SteamApp.find({ ...filter, name: { $not: /^App \d+$/ } }).sort(order).skip(skip).limit(size + 1).lean();
        const pageDocs = docs.slice(0, size);
        await this.fillPrices(pageDocs); // prix manquants de la page, en une seule requête groupée
        return { items: pageDocs.map(toPublic), hasMore: docs.length > size, page };
    }

    /**
     * Passe rapide des prix : 50 jeux par requête (appdetails + filters=price_overview).
     * Complète les prix de tout le catalogue en ~1 h, avant l'enrichissement détaillé jeu par jeu.
     * Retourne false quand il ne reste plus de jeu sans prix.
     */
    static async priceBatch(size = 50, cc = DEFAULT_CC): Promise<boolean> {
        const docs: any[] = await SteamApp.find({ price_fetched_at: null }).sort({ appid: -1 }).limit(size).select('appid').lean();
        if (docs.length === 0) return false;
        const data = await getJson(`${STORE}/api/appdetails?appids=${docs.map(d => d.appid).join(',')}&cc=${cleanCc(cc)}&filters=price_overview`, 30000);
        const now = new Date();
        const ops = docs.map(d => {
            const entry = data?.[d.appid];
            const po = entry?.success ? entry.data?.price_overview : null;
            return {
                updateOne: {
                    filter: { appid: d.appid },
                    update: {
                        $set: {
                            price: po ? {
                                currency: po.currency, initial: po.initial, final: po.final,
                                discount_percent: po.discount_percent,
                                initial_formatted: po.initial_formatted || po.final_formatted,
                                final_formatted: po.final_formatted
                            } : null,
                            price_fetched_at: now
                        }
                    }
                }
            };
        });
        await SteamApp.bulkWrite(ops, { ordered: false });
        return true;
    }

    static async stats() {
        const [total, enriched, unavailable] = await Promise.all([
            SteamApp.estimatedDocumentCount(),
            SteamApp.countDocuments({ details_fetched_at: { $ne: null }, unavailable_at: null }),
            SteamApp.countDocuments({ unavailable_at: { $ne: null } })
        ]);
        const priced = await SteamApp.countDocuments({ price_fetched_at: { $ne: null } });
        return { total, priced, enriched, unavailable, remaining: Math.max(total - enriched - unavailable, 0) };
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
        const match = { name_lower: { $regex: escaped }, name: { $not: /^App \d+$/ } };
        // Les jeux connus (classement de ventes / popularité) d'abord : sinon une recherche courte ne remonte que des inconnus
        const [known, others] = await Promise.all([
            SteamApp.find({ ...match, $or: [{ trend_rank: { $gt: 0 } }, { popularity_score: { $gt: 0 } }] }).limit(100).lean(),
            SteamApp.find(match).sort({ name_lower: 1 }).limit(300).lean()
        ]);
        const byId = new Map<number, any>();
        for (const d of [...known, ...others] as any[]) byId.set(d.appid, d);
        const docs: any[] = [...byId.values()];
        // Pertinence : correspondance exacte, puis préfixe, puis popularité (classement de ventes, nombre d'avis), puis nom court
        const popularity = (d: any) => (d.trend_rank > 0 ? d.trend_rank : d.popularity_score > 0 ? 5000 - Math.min(d.popularity_score / 1000, 4999) : 99999);
        const score = (d: any) =>
            (d.name_lower === term ? 0 : d.name_lower.startsWith(term) ? 1 : 2) * 1e9 +
            Math.min(popularity(d), 99999) * 100 + Math.min(d.name_lower.length, 99);
        const top = docs.sort((a, b) => score(a) - score(b)).slice(0, max);
        await this.fillPrices(top);
        return top.map(toPublic);
    }

    /** Récupère en un seul appel les prix des jeux dont on n'a pas encore le prix (max 20, échec silencieux). */
    private static async fillPrices(docs: any[], cc = DEFAULT_CC) {
        const missing = docs.filter(d => !d.price_fetched_at).slice(0, 50);
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
