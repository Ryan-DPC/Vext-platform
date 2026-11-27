import { test, expect } from '@playwright/test';
import { ensureApi, jsonBody } from '../../helpers/api';
import { API_URL } from '../../helpers/env';

test.describe('API catalogue / store @smoke @api', () => {
  test('GET /api/games/all returns a list', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/games/all`);
    expect(res.status(), await res.text()).toBe(200);

    const body = await jsonBody(res);
    expect(Array.isArray(body) || typeof body === 'object').toBeTruthy();
  });

  test('GET /api/items/store is reachable', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/items/store`);
    expect(res.status(), await res.text()).toBe(200);
  });

  test('GET /api/library/marketplace is public', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/library/marketplace`);
    expect(res.status(), await res.text()).toBe(200);
  });

  test('GET /api/library/blockchain-stats is public', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/library/blockchain-stats`);
    expect(res.status(), await res.text()).toBe(200);
  });

  test('GET /api/game-ownership/marketplace is public', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/game-ownership/marketplace`);
    expect(res.status(), await res.text()).toBe(200);
  });
});
