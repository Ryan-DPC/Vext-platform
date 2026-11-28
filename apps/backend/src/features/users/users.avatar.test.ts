import { beforeAll, describe, expect, test } from 'bun:test';
import { createHmac } from 'crypto';

// Même secret que les autres tests : le module config/jwt est partagé dans le processus de test
const SECRET = 'test-secret-'.padEnd(40, 'x');
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(payload: any) {
    const h = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
    return `${h}.${createHmac('sha256', SECRET).update(h).digest('base64url')}`;
}
const user = token({ id: '000000000000000000000001', username: 'u#0001', isAdmin: false });

let app: any;
beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    app = (await import('./users.routes')).usersRoutes;
});

const upload = (file: File, tok = user) => {
    const form = new FormData();
    form.set('avatar', file);
    return app.handle(new Request('http://localhost/api/users/avatar', { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: form }));
};

describe('upload d\'avatar (refus avant tout accès base)', () => {
    test('sans jeton => 401', async () => {
        const form = new FormData();
        form.set('avatar', new File([new Uint8Array([1])], 'a.png'));
        const res = await app.handle(new Request('http://localhost/api/users/avatar', { method: 'POST', body: form }));
        expect(res.status).toBe(401);
    });

    test('un fichier qui n\'est pas une image est refusé (même nommé .png)', async () => {
        const res = await upload(new File([new TextEncoder().encode('<script>alert(1)</script>')], 'evil.png', { type: 'image/png' }));
        expect(res.status).toBe(400);
    });

    test('image trop lourde refusée', async () => {
        const big = new Uint8Array(2 * 1024 * 1024 + 10);
        big.set([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0]);
        expect((await upload(new File([big], 'big.png'))).status).toBe(413);
    });

    test('URL d\'avatar JSON invalide refusée', async () => {
        const res = await app.handle(new Request('http://localhost/api/users/avatar', {
            method: 'POST',
            headers: { Authorization: `Bearer ${user}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: 'javascript:alert(1)' })
        }));
        expect(res.status).toBe(400);
    });
});
