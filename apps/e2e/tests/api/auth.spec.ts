import { test, expect } from '@playwright/test';
import { ensureApi, jsonBody } from '../../helpers/api';
import { API_URL, E2E_PASSWORD, E2E_USER, hasCredentials } from '../../helpers/env';

test.describe('API auth @smoke @api', () => {
  test('POST /api/auth/login rejects invalid credentials', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        username: 'definitely-not-a-real-user-xyz',
        password: 'wrong-password',
      },
    });

    // Handler returns 401 for unknown user / bad password
    expect([401, 400]).toContain(res.status());
    const body = await jsonBody(res);
    expect(body).toMatchObject({ success: false });
  });

  test('POST /api/auth/register validates tag format', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: 'smokeuser',
        email: 'smoke-invalid@example.com',
        password: 'SmokeTest123!',
        tag: '!!', // invalid: must be 3-4 alphanumeric
      },
    });

    expect(res.status()).toBe(400);
    const body = await jsonBody(res);
    expect(body).toMatchObject({ success: false });
  });

  test('POST /api/auth/register requires body fields', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: {},
    });

    // Elysia validation → 422 or 400
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('API auth login (credentials) @full @api', () => {
  test('POST /api/auth/login succeeds with E2E_USER / E2E_PASSWORD', async ({ request }) => {
    test.skip(!hasCredentials, 'Set E2E_USER and E2E_PASSWORD to run authenticated login smoke');
    await ensureApi(request, test);

    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: E2E_USER, password: E2E_PASSWORD },
    });

    expect(res.status(), await res.text()).toBe(200);
    const body = (await jsonBody(res)) as { success?: boolean; token?: string };
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.token!.length).toBeGreaterThan(10);
  });
});
