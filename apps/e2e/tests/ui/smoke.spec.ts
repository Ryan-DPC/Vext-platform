import { test, expect } from '@playwright/test';
import { BASE_URL, REQUIRE_UI } from '../../helpers/env';

let uiAvailable: boolean | null = null;

async function ensureUi(
  _page: { goto: (url: string, opts?: object) => Promise<unknown> },
  t: { skip: (condition?: boolean, description?: string) => void },
) {
  if (uiAvailable === null) {
    try {
      const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(8_000) });
      uiAvailable = res.ok || res.status === 200 || res.status < 500;
    } catch {
      uiAvailable = false;
    }
  }
  if (uiAvailable) return;
  const msg = `Frontend unreachable at ${BASE_URL}. Run: cd apps/frontend && bun run dev`;
  if (REQUIRE_UI) throw new Error(msg);
  t.skip(true, msg);
}

test.describe('UI smoke pages @smoke @ui', () => {
  test('login page renders brand and form', async ({ page }) => {
    await ensureUi(page, test);

    // Hash history: /#/login
    await page.goto('/#/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[name="username"], input[autocomplete="username"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"], input[autocomplete="current-password"]').first()).toBeVisible();
    await expect(page.getByRole('img', { name: /vext/i }).or(page.locator('.login-logo'))).toBeVisible();
  });

  test('register page is reachable', async ({ page }) => {
    await ensureUi(page, test);

    await page.goto('/#/register');
    await expect(page.locator('form').first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('UI protected routes redirect @ui @full', () => {
  test('store redirects unauthenticated users to login', async ({ page }) => {
    await ensureUi(page, test);

    await page.goto('/#/store');
    await expect(page).toHaveURL(/login/i, { timeout: 20_000 });
  });

  test('library redirects unauthenticated users to login', async ({ page }) => {
    await ensureUi(page, test);

    await page.goto('/#/library');
    await expect(page).toHaveURL(/login/i, { timeout: 20_000 });
  });

  test('wallet redirects unauthenticated users to login', async ({ page }) => {
    await ensureUi(page, test);

    await page.goto('/#/wallet');
    await expect(page).toHaveURL(/login/i, { timeout: 20_000 });
  });
});
