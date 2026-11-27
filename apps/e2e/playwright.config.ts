import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:3001';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * Vext e2e / smoke suite.
 *
 * Tags:
 *   @smoke  — fast critical path (API + login page)
 *   @full   — broader coverage (auth register flow, UI library/store)
 *   @api    — API-only (no browser needed beyond request context)
 *   @ui     — browser UI smoke
 *
 * Grep examples:
 *   bun run test:smoke
 *   bunx playwright test --grep @api
 *   bunx playwright test --grep "@smoke.*@ui"
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: {
        baseURL: API_URL,
      },
    },
    {
      name: 'ui-chromium',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
      },
    },
  ],
  metadata: {
    API_URL,
    BASE_URL,
  },
});
