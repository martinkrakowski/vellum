# Setup Guide

First-day guide for getting this project running.

## Topology

Yarn 4 workspaces monorepo, orchestrated by Turborepo:

- `apps/web` — **Next.js 15** (App Router). The demo surface: 3D review
  viewport, split view, review dashboard.
- `apps/api` — **Nitro**. Reserved seam for future server work; not used by
  the v1 demo.
- `packages/*` — hexagonal bounded contexts (`@vellum/*`), consumed **from
  TypeScript source** (exports point at `src/index.ts`; `apps/web` transpiles
  them via `transpilePackages`). No package emits runtime JS.

## Prerequisites

- Node.js 20+ (Corepack enabled — the repo pins `yarn@4.12.0`).
- Nothing else — the env check runs via the repo's own `tsx` dev dependency.

## First-Time Setup

1. Install dependencies:
   ```bash
   yarn install
   ```
2. Copy the env reference and fill in your values (all optional for the
   mocked v1 demo):
   ```bash
   cp .env.example .env.local
   ```
3. Validate, build, and start:
   ```bash
   yarn check:env
   yarn build
   yarn dev
   ```

## Commands

| Command          | What it does                                        |
| ---------------- | --------------------------------------------------- |
| `yarn build`     | Turbo build across all workspaces                   |
| `yarn check:env` | Env preflight (fails listing missing required vars) |
| `yarn dev`       | Dev servers (Next.js on web, Nitro on api)          |
| `yarn typecheck` | `tsc --noEmit` everywhere                           |
| `yarn lint`      | ESLint everywhere                                   |
| `yarn test`      | Vitest everywhere                                   |
| `yarn lint:arch` | Hexagonal layer/import rules (`hexagen arch validate`) |
| `yarn sync:check`| Verify generated scaffolding is in sync             |

## How Environment Validation Works

- `.env.example` is the committed reference; `.env.local` holds your real
  values and is gitignored.
- `apps/web/src/config/env.server.ts` validates server-only vars with Zod at
  startup. With strict validation on, a missing/invalid var throws immediately
  with a readable message; with it off, it logs a warning and uses defaults.
- `apps/web/src/config/env.client.ts` validates the public `NEXT_PUBLIC_*`
  vars. Never put a secret in a `NEXT_PUBLIC_` variable — it is shipped to the
  browser.
- Import **types** from `apps/web/src/config/env.ts` (a types-only barrel —
  it deliberately exports no runtime values, so server-only validation can
  never leak into a client bundle). Import **runtime** values from
  `apps/web/src/config/env.server.ts` (`serverEnv`) and
  `apps/web/src/config/env.client.ts` (`clientEnv`).
- Next.js loads `.env*` files natively — no loader import needed.

## Common Issues

| Symptom                               | Cause                                  | Fix                                                |
| ------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| Startup throws "validation failed"    | A required var is missing in env       | Read the listed keys; set them in `.env.local`     |
| A `NEXT_PUBLIC_` value is undefined   | Set after build, or not prefixed       | Prefix with `NEXT_PUBLIC_` and rebuild             |
| A secret leaked to the browser        | Secret was given a `NEXT_PUBLIC_` name | Rename without the prefix; keep it server-only     |
| Env check passes but app still errors | Var present but wrong value/format     | Check the Zod schema in `apps/web/src/config/env.server.ts` |
