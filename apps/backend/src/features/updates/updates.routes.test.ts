import { beforeAll, describe, expect, test } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TOKEN = 'x'.repeat(40);

let app: { handle: (r: Request) => Promise<Response> };

beforeAll(async () => {
    process.env.STORAGE_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'vext-updates-'));
    process.env.UPDATE_PUBLISH_TOKEN = TOKEN;
    process.env.BACKEND_URL = 'http://test.local';
    const { updatesRoutes } = await import('./updates.routes');
    app = updatesRoutes as any;
});

function publishForm(over: Record<string, string> = {}, fileName = 'VEXT_1.2.3_x64-setup.exe') {
    const form = new FormData();
    form.set('version', over.version ?? '1.2.3');
    form.set('platform', over.platform ?? 'windows-x86_64');
    form.set('signature', over.signature ?? 'sig');
    form.set('notes', 'notes');
    form.set('file', new File([new Uint8Array([1, 2, 3])], fileName));
    return form;
}

const publish = (form: FormData, token = TOKEN) =>
    app.handle(new Request('http://localhost/api/updates/publish', { method: 'POST', headers: { 'x-update-token': token }, body: form }));

describe('updates routes', () => {
    test('latest.json absent => 404', async () => {
        const res = await app.handle(new Request('http://localhost/api/updates/latest.json'));
        expect(res.status).toBe(404);
    });

    test('publication refusée avec un mauvais jeton', async () => {
        expect((await publish(publishForm(), 'wrong')).status).toBe(401);
    });

    test('version et nom de fichier invalides refusés', async () => {
        expect((await publish(publishForm({ version: '../1' }))).status).toBe(400);
        expect((await publish(publishForm({}, '../evil.exe'))).status).toBe(400);
        expect((await publish(publishForm({}, 'script.sh'))).status).toBe(400);
    });

    test('publication valide puis lecture du manifeste et du fichier', async () => {
        const res = await publish(publishForm());
        expect(res.status).toBe(200);

        const manifest = await (await app.handle(new Request('http://localhost/api/updates/latest.json'))).json();
        expect(manifest.version).toBe('1.2.3');
        expect(manifest.platforms['windows-x86_64'].url).toBe('http://test.local/api/updates/files/VEXT_1.2.3_x64-setup.exe');

        const file = await app.handle(new Request('http://localhost/api/updates/files/VEXT_1.2.3_x64-setup.exe'));
        expect(file.status).toBe(200);
        expect((await file.arrayBuffer()).byteLength).toBe(3);
    });

    test('accès hors dossier refusé', async () => {
        const res = await app.handle(new Request('http://localhost/api/updates/files/latest.json'));
        expect(res.status).toBe(400);
    });
});
