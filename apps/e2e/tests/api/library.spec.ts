import { test, expect } from '@playwright/test';
import { authHeaders, ensureApi, jsonBody } from '../../helpers/api';
import { API_URL, E2E_PASSWORD, E2E_USER, hasCredentials } from '../../helpers/env';

async function login(request: Parameters<typeof ensureApi>[0]): Promise<string> {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: E2E_USER, password: E2E_PASSWORD },
  });
  expect(res.status(), await res.text()).toBe(200);
  const body = (await jsonBody(res)) as { token?: string };
  expect(body.token).toBeTruthy();
  return body.token!;
}

test.describe('API library / ownership @smoke @api', () => {
  test('GET /api/library/my-games requires auth', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/library/my-games`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/game-ownership/my-games requires auth', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/game-ownership/my-games`);
    expect(res.status()).toBe(401);
  });
});

test.describe('API library authenticated @full @api', () => {
  test('GET /api/library/my-games with token', async ({ request }) => {
    test.skip(!hasCredentials, 'Set E2E_USER and E2E_PASSWORD');
    await ensureApi(request, test);

    const token = await login(request);
    const res = await request.get(`${API_URL}/api/library/my-games`, {
      headers: authHeaders(token),
    });
    expect(res.status(), await res.text()).toBe(200);
  });

  test('GET /api/users/me with token', async ({ request }) => {
    test.skip(!hasCredentials, 'Set E2E_USER and E2E_PASSWORD');
    await ensureApi(request, test);

    const token = await login(request);
    const res = await request.get(`${API_URL}/api/users/me`, {
      headers: authHeaders(token),
    });
    expect(res.status(), await res.text()).toBe(200);
  });
});
