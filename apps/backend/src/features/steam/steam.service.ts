import crypto from 'crypto';

const OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes

interface PendingLinkState {
    userId: string;
    expiresAt: number;
}

interface CachedGamesEntry {
    games: SteamOwnedGame[];
    source: 'api' | 'xml';
    isPrivateHint: boolean;
    expiresAt: number;
}

export interface SteamOwnedGame {
    id: string;
    app_id: string;
    name: string;
    platform: 'steam';
    image_url: string;
    hero_url: string;
    fallback_logo_url?: string;
    launch_url: string;
    installed: boolean;
    playtime_forever: number;
    genre: string;
}

const pendingStates = new Map<string, PendingLinkState>();
const ownedGamesCache = new Map<string, CachedGamesEntry>();

function cleanupExpiredStates() {
    const now = Date.now();
    for (const [key, val] of pendingStates.entries()) {
        if (val.expiresAt < now) pendingStates.delete(key);
    }
}

function stripCdata(raw: string): string {
    return raw
        .replace(/^<!\[CDATA\[/, '')
        .replace(/\]\]>$/, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function extractXmlTag(block: string, tag: string): string | null {
    const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = block.match(re);
    if (!match || !match[1]) return null;
    return stripCdata(match[1]);
}

export class SteamService {
    static createLinkState(userId: string): string {
        cleanupExpiredStates();
        const state = crypto.randomBytes(24).toString('hex');
        pendingStates.set(state, {
            userId,
            expiresAt: Date.now() + STATE_TTL_MS
        });
        return state;
    }

    static consumeLinkState(state: string): string | null {
        cleanupExpiredStates();
        const entry = pendingStates.get(state);
        if (!entry) return null;
        pendingStates.delete(state);
        if (entry.expiresAt < Date.now()) return null;
        return entry.userId;
    }

    static buildOpenIdLoginUrl(returnTo: string, realm: string): string {
        const params = new URLSearchParams({
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.mode': 'checkid_setup',
            'openid.return_to': returnTo,
            'openid.realm': realm,
            'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
            'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
        });
        return `${OPENID_ENDPOINT}?${params.toString()}`;
    }

    static async verifyOpenIdCallback(query: Record<string, string>): Promise<string | null> {
        if (query['openid.mode'] !== 'id_res' || !query['openid.claimed_id']) {
            return null;
        }

        const verifyParams = new URLSearchParams();
        for (const [k, v] of Object.entries(query)) {
            if (k.startsWith('openid.')) {
                verifyParams.set(k, k === 'openid.mode' ? 'check_authentication' : v);
            }
        }

        const res = await fetch(OPENID_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: verifyParams.toString()
        });

        if (!res.ok) return null;
        const body = await res.text();
        if (!body.includes('is_valid:true')) {
            return null;
        }

        const match = String(query['openid.claimed_id']).match(
            /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})\/?$/
        );
        return match ? match[1] : null;
    }

    static async resolveSteamIdInput(input: string): Promise<string | null> {
        const trimmed = String(input || '').trim();
        if (/^\d{17}$/.test(trimmed)) return trimmed;

        const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
        if (profileMatch) return profileMatch[1];

        const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
        const vanity = vanityMatch ? vanityMatch[1] : (/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed) ? trimmed : null);
        if (!vanity) return null;

        try {
            const res = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`);
            if (!res.ok) return null;
            const xml = await res.text();
            const id64 = extractXmlTag(xml, 'steamID64');
            return id64 && /^\d{17}$/.test(id64) ? id64 : null;
        } catch {
            return null;
        }
    }

    static async fetchSteamProfile(steamId: string): Promise<{ username: string | null; avatar: string | null }> {
        const apiKey = process.env.STEAM_API_KEY;
        if (apiKey) {
            try {
                const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(apiKey)}&steamids=${encodeURIComponent(steamId)}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data: any = await res.json();
                    const player = data?.response?.players?.[0];
                    if (player) {
                        return {
                            username: player.personaname || null,
                            avatar: player.avatarfull || player.avatarmedium || null
                        };
                    }
                }
            } catch {
                // Fallback to public XML below
            }
        }

        try {
            const res = await fetch(`https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}/?xml=1`);
            if (res.ok) {
                const xml = await res.text();
                return {
                    username: extractXmlTag(xml, 'steamID'),
                    avatar: extractXmlTag(xml, 'avatarFull')
                };
            }
        } catch {
            // Ignore network issues
        }

        return { username: null, avatar: null };
    }

    static async fetchOwnedGames(steamId: string, forceRefresh = false): Promise<{
        games: SteamOwnedGame[];
        source: 'api' | 'xml';
        isPrivateHint: boolean;
    }> {
        if (!forceRefresh) {
            const cached = ownedGamesCache.get(steamId);
            if (cached && cached.expiresAt > Date.now()) {
                return {
                    games: cached.games,
                    source: cached.source,
                    isPrivateHint: cached.isPrivateHint
                };
            }
        }

        const apiKey = process.env.STEAM_API_KEY;
        if (apiKey) {
            try {
                const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(apiKey)}&steamid=${encodeURIComponent(steamId)}&include_appinfo=1&include_played_free_games=1&format=json`;
                const res = await fetch(url);
                if (res.ok) {
                    const data: any = await res.json();
                    const rawGames: any[] = data?.response?.games || [];
                    const games: SteamOwnedGame[] = rawGames
                        .filter((g) => g?.appid && g?.name)
                        .map((g) => {
                            const appId = String(g.appid);
                            return {
                                id: `steam_${appId}`,
                                app_id: appId,
                                name: String(g.name),
                                platform: 'steam' as const,
                                image_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
                                hero_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`,
                                fallback_logo_url: g.img_icon_url
                                    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${g.img_icon_url}.jpg`
                                    : undefined,
                                launch_url: `steam://run/${appId}`,
                                installed: false,
                                playtime_forever: Number(g.playtime_forever || 0),
                                genre: 'Steam'
                            };
                        });

                    const isPrivateHint = games.length === 0;
                    ownedGamesCache.set(steamId, {
                        games,
                        source: 'api',
                        isPrivateHint,
                        expiresAt: Date.now() + CACHE_TTL_MS
                    });
                    return { games, source: 'api', isPrivateHint };
                }
            } catch {
                // Fall back to public XML feed
            }
        }

        // Public Steam Community XML fallback (no API key required)
        const xmlRes = await fetch(`https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}/games?tab=all&xml=1`);
        if (!xmlRes.ok) {
            return { games: [], source: 'xml', isPrivateHint: true };
        }
        const xml = await xmlRes.text();
        if (xml.includes('<error>') || !xml.includes('<game>')) {
            return { games: [], source: 'xml', isPrivateHint: true };
        }

        const games: SteamOwnedGame[] = [];
        const gameBlocks = xml.match(/<game>[\s\S]*?<\/game>/gi) || [];
        for (const block of gameBlocks) {
            const appId = extractXmlTag(block, 'appID');
            const name = extractXmlTag(block, 'name');
            if (!appId || !name) continue;
            const logo = extractXmlTag(block, 'logo') || undefined;
            const hoursStr = extractXmlTag(block, 'hoursOnRecord');
            const hours = hoursStr ? parseFloat(hoursStr.replace(/,/g, '')) : 0;

            games.push({
                id: `steam_${appId}`,
                app_id: appId,
                name,
                platform: 'steam',
                image_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
                hero_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`,
                fallback_logo_url: logo,
                launch_url: `steam://run/${appId}`,
                installed: false,
                playtime_forever: Number.isFinite(hours) ? Math.round(hours * 60) : 0,
                genre: 'Steam'
            });
        }

        const isPrivateHint = games.length === 0;
        ownedGamesCache.set(steamId, {
            games,
            source: 'xml',
            isPrivateHint,
            expiresAt: Date.now() + CACHE_TTL_MS
        });

        return { games, source: 'xml', isPrivateHint };
    }
}
