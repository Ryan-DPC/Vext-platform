/** Centralized env for the e2e suite. Override via apps/e2e/.env or process env. */

export const API_URL =
  process.env.API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:3001';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/** Optional credentials for authenticated smoke paths. */
export const E2E_USER = process.env.E2E_USER || '';
export const E2E_PASSWORD = process.env.E2E_PASSWORD || '';

/** When true, missing backend causes tests to fail instead of skip. */
export const REQUIRE_API = process.env.REQUIRE_API === '1' || process.env.REQUIRE_API === 'true';

/** When true, missing frontend causes UI tests to fail instead of skip. */
export const REQUIRE_UI = process.env.REQUIRE_UI === '1' || process.env.REQUIRE_UI === 'true';

export const hasCredentials = Boolean(E2E_USER && E2E_PASSWORD);
