import { test, expect } from '@playwright/test';
import { ensureApi, jsonBody } from '../../helpers/api';
import { API_URL } from '../../helpers/env';

test.describe('API health @smoke @api', () => {
  test('GET /health returns ok', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/health`);
    expect(res.status(), await res.text()).toBe(200);

    const body = await jsonBody(res);
    expect(body).toMatchObject({ status: 'ok' });
    expect(typeof (body as { uptime?: unknown }).uptime).toBe('number');
  });

  test('GET / returns running banner', async ({ request }) => {
    await ensureApi(request, test);

    const res = await request.get(`${API_URL}/`);
    expect(res.status()).toBe(200);

    const body = await jsonBody(res);
    expect(body).toMatchObject({ success: true });
    expect(String((body as { message?: string }).message || '')).toMatch(/VEXT/i);
  });
});
