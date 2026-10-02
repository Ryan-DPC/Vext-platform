import type { APIRequestContext, APIResponse } from '@playwright/test';
import { API_URL, REQUIRE_API } from './env';

export type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

let apiAvailable: boolean | null = null;

/** Probe /health once per worker; cache the result. */
export async function isApiReachable(request: APIRequestContext): Promise<boolean> {
  if (apiAvailable !== null) return apiAvailable;
  try {
    const res = await request.get(`${API_URL}/health`, { timeout: 10_000 });
    apiAvailable = res.ok();
  } catch {
    apiAvailable = false;
  }
  return apiAvailable;
}

/**
 * Skip (or throw if REQUIRE_API) when backend is down.
 * Call at the start of API smoke tests that need a live server.
 */
export async function ensureApi(
  request: APIRequestContext,
  test: { skip: (condition?: boolean, description?: string) => void },
): Promise<void> {
  const up = await isApiReachable(request);
  if (up) return;
  const msg = `Backend unreachable at ${API_URL}. Start it or set API_URL.`;
  if (REQUIRE_API) {
    throw new Error(msg);
  }
  test.skip(true, msg);
}

export async function jsonBody(res: APIResponse): Promise<Json> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Json;
  } catch {
    return text;
  }
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
