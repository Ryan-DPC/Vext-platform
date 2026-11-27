import { Elysia } from 'elysia';
import { timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Serveur de mises à jour Tauri (remplace GitHub Releases, compatible dépôt privé).
 *
 *  GET  /api/updates/latest.json          -> manifeste lu par l'updater Tauri (public)
 *  GET  /api/updates/files/:name          -> installateurs / signatures (public)
 *  POST /api/updates/publish              -> appelé par la CI (header x-update-token = UPDATE_PUBLISH_TOKEN)
 */

const MAX_FILE_BYTES = 500 * 1024 * 1024;
const ALLOWED_EXT = ['.exe', '.msi', '.zip', '.dmg', '.gz', '.appimage', '.deb', '.sig'];
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PLATFORM_RE = /^(windows|darwin|linux)-(x86_64|aarch64|i686|armv7)$/;

function updatesDir(): string {
    const dir = path.resolve(process.env.STORAGE_PATH || './storage', 'updates');
    fs.mkdirSync(path.join(dir, 'files'), { recursive: true });
    return dir;
}

function manifestPath() {
    return path.join(updatesDir(), 'latest.json');
}

function readManifest(): any | null {
    try {
        return JSON.parse(fs.readFileSync(manifestPath(), 'utf-8'));
    } catch {
        return null;
    }
}

function tokenOk(provided: string | undefined): boolean {
    const expected = process.env.UPDATE_PUBLISH_TOKEN;
    if (!expected || expected.length < 32 || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

function safeName(name: string): string | null {
    const base = path.basename(name);
    if (base !== name || !/^[A-Za-z0-9._-]{1,200}$/.test(base)) return null;
    if (!ALLOWED_EXT.includes(path.extname(base).toLowerCase())) return null;
    return base;
}

export const updatesRoutes = new Elysia({ prefix: '/api/updates' })
    .get('/latest.json', ({ set }) => {
        const manifest = readManifest();
        if (!manifest) {
            set.status = 404;
            return { error: 'Aucune version publiée' };
        }
        set.headers['cache-control'] = 'no-cache';
        return manifest;
    })
    .get('/files/:name', ({ params: { name }, set }) => {
        const safe = safeName(name);
        if (!safe) {
            set.status = 400;
            return { error: 'Nom de fichier invalide' };
        }
        const file = path.join(updatesDir(), 'files', safe);
        if (!fs.existsSync(file)) {
            set.status = 404;
            return { error: 'Fichier introuvable' };
        }
        set.headers['content-disposition'] = `attachment; filename="${safe}"`;
        return Bun.file(file);
    })
    .post('/publish', async ({ request, headers, set }) => {
        if (!process.env.UPDATE_PUBLISH_TOKEN) {
            set.status = 503;
            return { error: 'Publication désactivée (UPDATE_PUBLISH_TOKEN non défini)' };
        }
        if (!tokenOk(headers['x-update-token'])) {
            set.status = 401;
            return { error: 'Token invalide' };
        }

        const form = await request.formData();
        const version = String(form.get('version') || '');
        const platform = String(form.get('platform') || '');
        const signature = String(form.get('signature') || '').trim();
        const notes = String(form.get('notes') || '');
        const file = form.get('file');

        if (!VERSION_RE.test(version)) { set.status = 400; return { error: 'version invalide' }; }
        if (!PLATFORM_RE.test(platform)) { set.status = 400; return { error: 'platform invalide' }; }
        if (!signature) { set.status = 400; return { error: 'signature requise' }; }
        if (!(file instanceof File)) { set.status = 400; return { error: 'file requis' }; }
        if (file.size > MAX_FILE_BYTES) { set.status = 413; return { error: 'fichier trop gros' }; }

        const name = safeName(file.name);
        if (!name) { set.status = 400; return { error: 'nom de fichier invalide' }; }

        await Bun.write(path.join(updatesDir(), 'files', name), file);

        const base = (process.env.BACKEND_URL || new URL(request.url).origin).replace(/\/$/, '');
        const current = readManifest();
        // Une version plus récente écrase le manifeste ; la même version ajoute une plateforme.
        const manifest = current && current.version === version
            ? current
            : { version, notes, pub_date: new Date().toISOString(), platforms: {} };
        if (notes) manifest.notes = notes;
        manifest.platforms[platform] = {
            signature,
            url: `${base}/api/updates/files/${name}`
        };

        // Écriture atomique pour ne jamais servir un manifeste à moitié écrit
        const tmp = manifestPath() + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
        fs.renameSync(tmp, manifestPath());

        return { success: true, version, platform, url: manifest.platforms[platform].url };
    });
