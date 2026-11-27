import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { JWT_SECRET } from '../../config/jwt';
import { SteamCatalogService, toPublic } from './steam-catalog.service';

export const steamCatalogRoutes = new Elysia({ prefix: '/api/steam-catalog' })
    .use(jwt({ name: 'jwt', secret: JWT_SECRET }))
    .derive(async ({ headers, jwt }) => {
        const auth = headers['authorization'];
        if (!auth || !auth.startsWith('Bearer ')) return { user: null };
        const payload = await jwt.verify(auth.slice(7));
        return { user: payload || null };
    })
    .onBeforeHandle(({ user, set }) => {
        if (!user) {
            set.status = 401;
            return { message: 'Unauthorized' };
        }
    })
    .get('/featured', async () => SteamCatalogService.featured())
    .get('/search', async ({ query }) => SteamCatalogService.search(query.q, Number(query.limit) || 24), {
        query: t.Object({ q: t.String({ minLength: 2, maxLength: 80 }), limit: t.Optional(t.String()) })
    })
    .get('/app/:appid', async ({ params: { appid }, query, set }) => {
        const id = Number(appid);
        if (!Number.isInteger(id) || id <= 0) {
            set.status = 400;
            return { message: 'appid invalide' };
        }
        const doc = await SteamCatalogService.getApp(id, query.cc);
        if (!doc) {
            set.status = 404;
            return { message: 'Jeu introuvable' };
        }
        return toPublic(doc);
    }, { query: t.Object({ cc: t.Optional(t.String()) }) })
    .post('/sync', async ({ user, set }) => {
        if (!(user as any)?.isAdmin) {
            set.status = 403;
            return { error: 'Admin access required' };
        }
        // Lancé en arrière-plan : la liste complète peut prendre plusieurs minutes
        SteamCatalogService.syncAppList()
            .then(r => console.log('[SteamCatalog] app list OK', r))
            .catch(e => console.error('[SteamCatalog] app list', e.message));
        SteamCatalogService.syncFeatured().catch(e => console.error('[SteamCatalog] featured', e.message));
        return { success: true, message: 'Synchronisation lancée' };
    });
