import { beforeAll, describe, expect, test } from 'bun:test';
import { createHmac } from 'crypto';

const SECRET = 'test-secret-'.padEnd(40, 'x');
let app: { handle: (r: Request) => Promise<Response> };

const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(payload: any) {
    const h = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
    return `${h}.${createHmac('sha256', SECRET).update(h).digest('base64url')}`;
}

beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.ALLOW_FREE_DEPOSITS;
    const mod = await import('./finance.routes');
    app = mod.financeRoutes as any;
});

const post = (path: string, body: any, tok?: string) =>
    app.handle(new Request(`http://localhost/api/finance/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify(body)
    }));

const user = token({ id: '000000000000000000000001', username: 'u#0001', isAdmin: false });
const admin = token({ id: '000000000000000000000002', username: 'a#0001', isAdmin: true });

describe('finance routes', () => {
    test('sans jeton => 401', async () => {
        expect((await post('deposit', { amount: 10, currency: 'CHF' })).status).toBe(401);
    });

    test('un utilisateur normal ne peut pas se créditer de l\'argent', async () => {
        expect((await post('deposit', { amount: 1000, currency: 'CHF' }, user)).status).toBe(403);
    });

    test('montants invalides refusés (négatif, zéro, NaN, énorme)', async () => {
        for (const amount of [-5, 0, 'abc', 1e12, null]) {
            expect((await post('withdraw', { amount, currency: 'CHF' }, user)).status).toBe(400);
            expect((await post('deposit', { amount, currency: 'CHF' }, admin)).status).toBe(400);
        }
    });

    test('devise hors liste blanche refusée', async () => {
        expect((await post('withdraw', { amount: 5, currency: 'chf.__proto__' }, user)).status).toBe(400);
        expect((await post('withdraw', { amount: 5, currency: 'DOGE' }, user)).status).toBe(400);
    });
});
