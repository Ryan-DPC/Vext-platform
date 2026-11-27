import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHmac } from 'crypto';

/**
 * Vérifie que les routes sensibles refusent les utilisateurs non-admin / non connectés.
 * Aucune base de données n'est nécessaire : les refus se produisent avant tout accès DB.
 */
const SECRET = 'test-secret-'.padEnd(40, 'x'); // identique aux autres tests : le module config/jwt est partagé dans le processus
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(payload: any) {
    const h = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
    return `${h}.${createHmac('sha256', SECRET).update(h).digest('base64url')}`;
}
const user = token({ id: '000000000000000000000001', username: 'u#0001', isAdmin: false });

let gamesRoutes: any, itemsRoutes: any, libraryRoutes: any, lobbyRoutes: any;

beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    gamesRoutes = (await import('./games/games.routes')).gamesRoutes;
    itemsRoutes = (await import('./items/items.routes')).itemsRoutes;
    libraryRoutes = (await import('./library/library.routes')).libraryRoutes;
    lobbyRoutes = (await import('./lobby/lobby.routes')).lobbyRoutes;
});

afterAll(() => {
    // les modules importés peuvent garder des timers ouverts : on laisse bun test terminer
});

const call = (app: any, method: string, path: string, tok?: string, body: any = {}) =>
    app.handle(new Request(`http://localhost${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(body)
    }));

describe('autorisations des routes sensibles', () => {
    test('ajout / mise à jour de jeu : interdit aux non-admins', async () => {
        // sans jeton : refus par validation du corps (422) ou par l'authentification (401), jamais un succès
        expect([401, 422]).toContain((await call(gamesRoutes, 'POST', '/api/games/add', undefined, {})).status);
        expect((await call(gamesRoutes, 'POST', '/api/games/add', user, { game_name: 'x', folder_name: 'x' })).status).toBe(403);
        expect((await call(gamesRoutes, 'POST', '/api/games/update', user, { gameId: 'x', version: '1.0.0', zipUrl: 'http://evil' })).status).toBe(403);
    });

    test('génération de clés : interdite aux non-admins', async () => {
        expect((await call(libraryRoutes, 'POST', '/api/library/keys/generate', user, { gameId: 'x', quantity: 5 })).status).toBe(403);
    });

    test('archivage d\'objet : interdit aux non-admins', async () => {
        expect((await call(itemsRoutes, 'DELETE', '/api/items/abc', user)).status).toBe(403);
    });

    test('actions de lobby : connexion requise', async () => {
        expect((await call(lobbyRoutes, 'POST', '/api/lobby/remove-player', undefined, { socketId: 'x' })).status).toBe(401);
        expect((await call(lobbyRoutes, 'POST', '/api/lobby/create', undefined, { socketId: 'x' })).status).toBe(401);
    });
});
