import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { Users } from '@vext/database';
import { SteamService } from './steam.service';

function renderCallbackHtml(success: boolean, title: string, message: string) {
    const color = success ? '#00e676' : '#ff5c9e';
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>VEXT &bull; Steam</title>
<style>
  body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #120c18; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: rgba(30,25,40,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 36px 40px; max-width: 440px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(102,192,244,0.15); color: #66c0f4; font-weight: 700; font-size: 12px; letter-spacing: 1px; margin-bottom: 16px; }
  h1 { margin: 0 0 12px; font-size: 22px; color: ${color}; }
  p { margin: 0 0 20px; color: #b0b9c3; line-height: 1.5; font-size: 14px; }
  .hint { font-size: 12px; color: #7c8594; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">VEXT &times; STEAM</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="hint">Vous pouvez fermer cet onglet et revenir sur l'application VEXT.</div>
  </div>
</body>
</html>`;
}

export const steamRoutes = new Elysia({ prefix: '/api/steam' })
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'default_secret'
    }))
    .derive(async ({ headers, jwt }) => {
        const auth = headers['authorization'];
        if (!auth || !auth.startsWith('Bearer ')) {
            return { user: null };
        }
        const token = auth.slice(7);
        const payload = await jwt.verify(token);
        if (!payload) {
            return { user: null };
        }
        return { user: payload };
    })
    // Public OpenID callback invoked by Steam redirect
    .get('/callback', async ({ query, set }) => {
        set.headers['Content-Type'] = 'text/html; charset=utf-8';
        try {
            const state = String((query as any).state || '');
            const userId = SteamService.consumeLinkState(state);
            if (!userId) {
                set.status = 400;
                return renderCallbackHtml(
                    false,
                    'Lien expiré ou invalide',
                    'La session de liaison Steam a expiré. Relancez la connexion depuis VEXT.'
                );
            }

            const steamId = await SteamService.verifyOpenIdCallback(query as Record<string, string>);
            if (!steamId) {
                set.status = 400;
                return renderCallbackHtml(
                    false,
                    'Authentification Steam refusée',
                    'Steam n\'a pas validé la connexion. Réessayez depuis VEXT.'
                );
            }

            const profile = await SteamService.fetchSteamProfile(steamId);
            await Users.updateUser(userId, {
                steam_id: steamId,
                steam_username: profile.username || `Steam #${steamId.slice(-4)}`,
                steam_avatar: profile.avatar
            });

            return renderCallbackHtml(
                true,
                'Compte Steam lié !',
                `Votre compte <strong>${profile.username || steamId}</strong> est maintenant connecté à VEXT. Votre bibliothèque va se synchroniser automatiquement.`
            );
        } catch (err: any) {
            set.status = 500;
            return renderCallbackHtml(
                false,
                'Erreur serveur',
                err?.message || 'Impossible de finaliser la liaison Steam.'
            );
        }
    })
    .post('/link/start', async ({ user, request, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
        const state = SteamService.createLinkState(user.id as string);
        const publicBase =
            process.env.VEXT_PUBLIC_URL ||
            process.env.PUBLIC_URL ||
            (() => {
                const u = new URL(request.url);
                return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
                    ? `${u.protocol}//${u.host}`
                    : 'https://hoopslive.ch/vext';
            })();

        const cleanBase = publicBase.replace(/\/+$/, '');
        const returnTo = `${cleanBase}/api/steam/callback?state=${encodeURIComponent(state)}`;
        const realm = new URL(cleanBase).origin;
        const authUrl = SteamService.buildOpenIdLoginUrl(returnTo, realm);

        return { success: true, authUrl, state };
    })
    .post('/link/manual', async ({ user, body, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
        const { steamIdOrUrl } = body as { steamIdOrUrl: string };
        const steamId = await SteamService.resolveSteamIdInput(steamIdOrUrl);
        if (!steamId) {
            set.status = 400;
            return {
                success: false,
                message: 'SteamID64 ou URL de profil Steam invalide.'
            };
        }

        const profile = await SteamService.fetchSteamProfile(steamId);
        await Users.updateUser(user.id as string, {
            steam_id: steamId,
            steam_username: profile.username || `Steam #${steamId.slice(-4)}`,
            steam_avatar: profile.avatar
        });

        return {
            success: true,
            steam_id: steamId,
            steam_username: profile.username,
            steam_avatar: profile.avatar
        };
    }, {
        body: t.Object({
            steamIdOrUrl: t.String()
        })
    })
    .delete('/link', async ({ user, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
        await Users.updateUser(user.id as string, {
            steam_id: null,
            steam_username: null,
            steam_avatar: null
        });
        return { success: true };
    })
    .get('/owned-games', async ({ user, query, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
        const dbUser = await Users.getUserById(user.id as string);
        const steamId = dbUser?.steam_id;
        if (!steamId) {
            return {
                success: true,
                linked: false,
                games: [],
                isPrivateHint: false
            };
        }

        const force = String((query as any).refresh || '') === '1';
        const result = await SteamService.fetchOwnedGames(steamId, force);
        return {
            success: true,
            linked: true,
            steam_id: steamId,
            steam_username: dbUser.steam_username || null,
            ...result
        };
    });
