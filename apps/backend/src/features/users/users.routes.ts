
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { JWT_SECRET } from '../../config/jwt';
import { UsersService } from './users.service';
import fs from 'fs';
import path from 'path';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Détecte le vrai format par signature (on ne se fie ni à l'extension ni au type MIME du client). */
function detectImageExt(b: Uint8Array): string | null {
    if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
    if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
    if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
    if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
    return null;
}

export const usersRoutes = new Elysia({ prefix: '/api/users' })
    .use(jwt({
        name: 'jwt',
        secret: JWT_SECRET
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
    .onBeforeHandle(({ user, set }) => {
        if (!user) {
            set.status = 401;
            return { message: 'Unauthorized' };
        }
    })

    // Profile Management
    .get('/me', async ({ user, set }) => {
        try {
            return await UsersService.getUserProfile(user!.id as string);
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    })
    .put('/me', async ({ user, body, set }) => {
        try {
            return await UsersService.updateProfile(user!.id as string, body);
        } catch (error: any) {
            set.status = 400; // Likely validation or duplicate error
            return { message: error.message };
        }
    }, {
        body: t.Object({
            username: t.Optional(t.String()),
            email: t.Optional(t.String()),
            language: t.Optional(t.String()),
            bio: t.Optional(t.String()),
            social_links: t.Optional(t.Any()), // Using Any for flexibility, could be Record
            notification_preferences: t.Optional(t.Any())
        })
    })

    // Upload Avatar (simplified via JSON for now, assuming external upload service or separate multipart handler)
    // Note: The original used multipart/form-data. For now, we assume frontend sends URL after upload.
    // If multipart upload is needed within Elysia, it requires specific plugin.
    .post('/avatar', async ({ user, request, set }) => {
        try {
            const type = request.headers.get('content-type') || '';
            let avatarUrl: string | null = null;

            if (type.includes('multipart/form-data')) {
                // Upload d'image : le client envoie le champ « avatar » (voir Profile.vue)
                const file = (await request.formData()).get('avatar');
                if (!(file instanceof File)) {
                    set.status = 400;
                    return { success: false, message: 'Fichier avatar manquant.' };
                }
                if (file.size > MAX_AVATAR_BYTES) {
                    set.status = 413;
                    return { success: false, message: 'Image trop lourde (2 Mo maximum).' };
                }
                const bytes = new Uint8Array(await file.arrayBuffer());
                const ext = detectImageExt(bytes);
                if (!ext) {
                    set.status = 400;
                    return { success: false, message: 'Format non supporté (PNG, JPEG, GIF ou WebP).' };
                }
                const dir = path.resolve(process.env.STORAGE_PATH || './storage', 'avatars');
                fs.mkdirSync(dir, { recursive: true });
                // Nom généré côté serveur : jamais celui du client
                const name = `${user!.id}_${Date.now()}.${ext}`;
                await Bun.write(path.join(dir, name), bytes);
                const base = (process.env.STORAGE_PUBLIC_URL || `${process.env.BACKEND_URL || ''}/storage`).replace(/\/$/, '');
                avatarUrl = `${base}/avatars/${name}`;
            } else {
                const body: any = await request.json().catch(() => ({}));
                const url = String(body?.avatarUrl || '');
                if (url.length > 500 || !/^(https:\/\/|\/)/.test(url)) {
                    set.status = 400;
                    return { success: false, message: "URL d'avatar invalide." };
                }
                avatarUrl = url;
            }

            const result = await UsersService.updateAvatar(user!.id as string, avatarUrl);
            return { success: true, ...result };
        } catch (error: any) {
            set.status = 500;
            return { success: false, message: error.message };
        }
    })

    // Search
    .get('/search', async ({ query, user, set }) => {
        try {
            const { q } = query;
            if (!q) {
                set.status = 400;
                return { message: 'Query parameter "q" is required' };
            }
            return await UsersService.searchUsers(q, user!.id as string);
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    }, {
        query: t.Object({
            q: t.String() // search term
        })
    })

    // Recent Games
    .get('/recent-games', async ({ user, set }) => {
        try {
            return await UsersService.getRecentGames(user!.id as string);
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    })

    // Wishlist
    .get('/wishlist', async ({ user, set }) => {
        try {
            return await UsersService.getWishlist(user!.id as string);
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    })
    .post('/wishlist', async ({ user, body, set }) => {
        try {
            const { gameId } = body;
            return await UsersService.addToWishlist(user!.id as string, gameId);
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    }, {
        body: t.Object({
            gameId: t.String()
        })
    })
    .delete('/wishlist/:gameId', async ({ user, params: { gameId }, set }) => {
        try {
            return await UsersService.removeFromWishlist(user!.id as string, gameId);
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    })

    // ELO
    .get('/:userId/elo', async ({ params: { userId }, set }) => {
        try {
            return await UsersService.getUserElo(userId);
        } catch (error: any) {
            set.status = 404;
            return { message: error.message };
        }
    })
    .put('/elo', async ({ user, body, set }) => {
        // Fixer librement son propre ELO = tricher au classement : réservé aux admins
        if (!(user as any)?.isAdmin) {
            set.status = 403;
            return { message: 'Admin access required' };
        }
        try {
            const { newElo } = body;
            return await UsersService.updateUserElo(user!.id as string, newElo);
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    }, {
        body: t.Object({
            newElo: t.Number()
        })
    })

    // Public Profile
    .get('/:userId', async ({ params: { userId }, set }) => {
        try {
            const profile = await UsersService.getPublicProfile(userId);
            if (!profile) {
                set.status = 404;
                return { message: 'User not found' };
            }
            return profile;
        } catch (error: any) {
            set.status = 500;
            return { message: error.message };
        }
    });

