# Vext e2e / smoke suite

Playwright suite for **API smoke** (critical distributor paths) and optional **UI smoke** (Vite web mode, hash router).

## Prerequisites

- [Bun](https://bun.sh) (or Node 20+)
- Backend reachable at `API_URL` (default `http://localhost:3001`) for API tests
- Frontend Vite (`bun run dev` in `apps/frontend`) at `BASE_URL` for UI tests
- Chromium browsers: `bun run install:browsers` from this package

If a service is down, tests **skip** by default (set `REQUIRE_API=1` / `REQUIRE_UI=1` to fail instead).

## Quick start

```bash
# From monorepo root
bun install
cd apps/e2e
bun run install:browsers
cp .env.example .env   # edit API_URL / BASE_URL if needed

# Smoke only (API + login UI)
bun run test:smoke

# API smoke only
bun run test:api

# Full suite
bun run test:full
```

From root:

```bash
bun run test:smoke    # → apps/e2e smoke
bun run test:e2e      # → full playwright suite
bun run test          # unit (frontend vitest) + smoke
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `API_URL` | `http://localhost:3001` | Backend base URL |
| `BASE_URL` | `http://localhost:5173` | Frontend Vite URL |
| `E2E_USER` / `E2E_PASSWORD` | empty | Enables `@full` authenticated API tests |
| `REQUIRE_API` | `0` | Fail (don’t skip) if backend down |
| `REQUIRE_UI` | `0` | Fail (don’t skip) if frontend down |

Production Render API may be suspended — prefer a local backend or a staging URL.

## Tags (moderation)

| Tag | Scope |
|---|---|
| `@smoke` | Critical path: health, auth validation, catalogue, library/finance auth gates, login UI |
| `@full` | Extra: real login, library/me, finance history, protected UI redirects |
| `@api` | API request tests only |
| `@ui` | Browser UI |

```bash
bunx playwright test --grep @smoke
bunx playwright test --grep @api
bunx playwright test --grep "@full.*@api"
bunx playwright test tests/api/health.spec.ts
```

## Local stack

```bash
# Infra (Mongo/Redis) if needed
docker-compose -f docker-compose.infra.yml up -d   # if present

# Backend
cd apps/backend && bun run dev

# Frontend (web, not Tauri)
cd apps/frontend && bun run dev
```

Tauri desktop is out of scope for headless CI; UI smoke targets Vite on port 5173.

## Dry-run without a real backend

```bash
bun run mock:api   # terminal 1 — http://127.0.0.1:3001
API_URL=http://127.0.0.1:3001 E2E_USER=e2euser E2E_PASSWORD=e2epass bun run test:api
```

The mock implements only the smoke endpoints (health, auth validation, catalogue, auth gates). Use a real `apps/backend` for true integration.
