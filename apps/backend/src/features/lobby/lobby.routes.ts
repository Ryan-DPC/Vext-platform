
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { lobbyService } from './lobby.service';
import { JWT_SECRET } from '../../config/jwt';

export const lobbyRoutes = new Elysia({ prefix: '/api/lobby' })
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
        return { user: payload };
    })
    .onBeforeHandle(({ user, set }) => {
        if (!user) {
            set.status = 401;
            return { message: 'Authentication required' };
        }
    })
    .post('/create', ({ body, user }) => {
        const { gameId, gameName } = body as any;
        const userId = (user as any).id;
        const lobbyId = lobbyService.createLobby(userId);
        const lobby = lobbyService.getLobby(lobbyId);
        return {
            success: true,
            lobby: {
                id: lobbyId,
                gameId,
                gameName,
                hostId: userId,
                players: [{
                    userId,
                    username: (user as any).username,
                    isHost: true
                }],
                maxPlayers: 4,
                createdAt: new Date().toISOString()
            }
        };
    }, {
        body: t.Object({
            gameId: t.String(),
            gameName: t.String()
        })
    })
    .post('/join', ({ body, user }) => {
        const { lobbyId } = body as any;
        const userId = (user as any).id;
        const joined = lobbyService.joinLobby(lobbyId, userId);
        if (!joined) {
            return { success: false, message: 'Lobby not found or full' };
        }
        const players = lobbyService.getPlayers(lobbyId);
        return {
            success: true,
            lobby: {
                id: lobbyId,
                players: players.map((pid: string, i: number) => ({
                    userId: pid,
                    isHost: i === 0
                }))
            }
        };
    }, {
        body: t.Object({
            lobbyId: t.String()
        })
    })
    .post('/leave', ({ body, user }) => {
        const userId = (user as any).id;
        const lobbyId = lobbyService.leaveLobby(userId);
        return { success: !!lobbyId, lobbyId };
    })
    .get('/:lobbyId/players', ({ params: { lobbyId } }) => {
        return lobbyService.getPlayers(lobbyId);
    })

    // Game Session Management (Protected)
    .group('/session', (app) => app
        .post('/create', async ({ body, user, set }) => {
            const { gameId, gameFolderName, ownershipToken } = body as any;
            try {
                return await lobbyService.createSession((user as any).id, gameId, gameFolderName, ownershipToken);
            } catch (err: any) {
                set.status = 400;
                return { message: err.message };
            }
        })
        .post('/heartbeat', async ({ body }) => {
            const { sessionToken } = body as any;
            const success = await lobbyService.updateHeartbeat(sessionToken);
            return { success };
        })
        .post('/end', async ({ body }) => {
            const { sessionToken } = body as any;
            const success = await lobbyService.endSession(sessionToken);
            return { success };
        })
        .get('/active', async ({ user }) => {
            return await lobbyService.getActiveSession((user as any).id);
        })
    );
