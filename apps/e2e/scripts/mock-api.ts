/**
 * Lightweight stand-in for the Elysia backend so API smoke can be dry-run
 * without Mongo/Redis. Not a substitute for real integration against apps/backend.
 *
 *   bun run scripts/mock-api.ts
 *   API_URL=http://127.0.0.1:3001 bun run test:api
 */
const port = Number(process.env.PORT || 3001);

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname: path } = url;
    const method = req.method;
    const auth = req.headers.get('authorization');

    if (path === '/health') {
      return Response.json({ status: 'ok', uptime: process.uptime() });
    }
    if (path === '/') {
      return Response.json({
        success: true,
        message: 'VEXT Backend (Elysia + Native WS) is running',
        version: '1.0.0-mock',
      });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const body = (await req.json()) as { username?: string; password?: string };
      if (body.username === 'e2euser' && body.password === 'e2epass') {
        return Response.json({
          success: true,
          token: 'mock-jwt-token-abcdefghijklmnopqrstuvwxyz',
          user: { id: '1', username: 'e2euser#tag' },
        });
      }
      return Response.json({ success: false, message: 'User not found.' }, { status: 401 });
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const body = (await req.json()) as Record<string, unknown>;
      if (!body.username || !body.email || !body.password || !body.tag) {
        return new Response(JSON.stringify({ message: 'Validation failed' }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (!/^[a-zA-Z0-9]{3,4}$/.test(String(body.tag))) {
        return Response.json(
          { success: false, message: 'Tag must be 3-4 alphanumeric characters.' },
          { status: 400 },
        );
      }
      return Response.json({ success: true, token: 'mock', user: {} });
    }

    if (path === '/api/games/all') return Response.json([{ id: '1', game_name: 'Demo' }]);
    if (path === '/api/items/store') return Response.json([]);
    if (path === '/api/library/marketplace') return Response.json([]);
    if (path === '/api/library/blockchain-stats') return Response.json({ total: 0 });
    if (path === '/api/game-ownership/marketplace') return Response.json([]);

    const protectedGet = new Set([
      '/api/library/my-games',
      '/api/game-ownership/my-games',
      '/api/finance/history',
      '/api/users/me',
    ]);
    if (protectedGet.has(path) && method === 'GET') {
      if (!auth?.startsWith('Bearer ')) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
      }
      return Response.json(path === '/api/users/me' ? { id: '1', username: 'e2euser#tag' } : []);
    }

    if (path === '/api/finance/deposit' && method === 'POST') {
      if (!auth?.startsWith('Bearer ')) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ message: 'not found' }, { status: 404 });
  },
});

console.log(`🧪 Vext mock API listening on http://127.0.0.1:${port}`);
