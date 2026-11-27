import { test, expect } from '@playwright/test';
import { authHeaders, ensureApi, jsonBody } from '../../helpers/api';
import { API_URL, E2E_PASSWORD, E2E_USER, hasCredentials } from '../../helpers/env';

test.describe('API finance / wallet @smoke @api', () => {
  test('GET /api/finance/history requires auth', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/api/finance/history`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/finance/deposit requires auth', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.post(`${API_URL}/api/finance/deposit`, {
      data: { amount: 1, currency: 'CHF', method: 'test' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('API finance authenticated @full @api', () => {
  test('GET /api/finance/history with token', async ({ request }) => {
    test.skip(!hasCredentials, 'Set E2E_USER and E2E_PASSWORD');
    await ensureApi(request, test);

    const login = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: E2E_USER, password: E2E_PASSWORD },
    });
    expect(login.status()).toBe(200);
    const { token } = (await jsonBody(login)) as { token: string };

    const res = await request.get(`${API_URL}/api/finance/history`, {
      headers: authHeaders(token),
    });
    expect(res.status(), await res.text()).toBe(200);
  });
});
