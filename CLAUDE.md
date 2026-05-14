# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A pnpm monorepo that takes a URL, renders it with Playwright, and uses Claude Haiku 4.5 (via tool use + zod validation) to extract the HTML snippet of the page's authentication component. Deployed at `https://get-covered-assessment.10xdev.io`.

`docs/decisions.md` is the source of architectural truth — 23 ADR-style entries (D-001 through D-023) explaining *why* each choice was made, with alternatives considered. **Read it before making non-trivial changes.** `docs/plan.md` is the implementation roadmap.

## Common commands

```bash
pnpm install                    # First-time setup; native build of better-sqlite3 runs
pnpm run dev:web                # Next.js on http://localhost:3002
pnpm run start:worker           # tsx runs the queue loop (needs ANTHROPIC_API_KEY)
pnpm run dev:worker             # tsx watch mode
pnpm --filter @app/web build    # Next.js production build
deploy/deploy.sh                # Ansible deploy to the VPS (needs deploy/vars.yml + inventory.ini)
```

The worker loads env via `tsx --env-file=../../.env` — put `ANTHROPIC_API_KEY` in `.env` at the repo root (gitignored). For production, `deploy/vars.yml` (gitignored) drives the playbook.

## Architecture

**Three workspaces:**
- `apps/web` — Next.js 16 App Router. Server action `submitUrl` (zod-validated, SSRF-guarded), route handler `GET /api/jobs`. The home page server-fetches initial jobs and hands off to a client `JobsView` that polls `/api/jobs` every 1.5s for the lifetime of the component, with an immediate refetch on submit.
- `apps/worker` — Long-running Node process that polls SQLite, claims a row atomically, renders the page with Playwright, cleans the HTML with cheerio, asks Claude to identify the auth component, validates the response with zod (one retry on failure), and writes the result back.
- `packages/shared` — Zod schemas, `Job` types, and the SQLite layer. Imported by both apps as `@app/shared`.

**SQLite is the queue.** No Redis, no rabbit, no second service. The `jobs` table (schema in `packages/shared/db.ts`) uses `status + claimed_at` for atomic UPDATE-with-RETURNING claim semantics (D-009). A stuck job is auto-reclaimed after 5 minutes. `attempts` caps retries at 3 before going to `failed`.

**Single writer, serial processing.** One worker, one job at a time. The queue itself is the rate limiter — no separate rate-limit layer. WAL mode lets the web read concurrently.

**Detection pipeline** (in `apps/worker/`):
1. `playwright.ts` renders with minimal stealth (UA, viewport, locale, timezone, `navigator.webdriver` patch). Waits for DOMContentLoaded, then up to 8s for networkidle (caps SPA render time without hanging on chatty pages).
2. `clean.ts` is a three-tier HTML reducer (D-013): always strip `<script>`/`<style>`/comments/SVGs/images; if still over ~50K tokens, extract only subtrees containing form/input/button or matching `/login|signin|auth|account|password|email/i`; hard-truncate as last resort.
3. `detect.ts` calls Claude Haiku 4.5 with `tool_choice` forcing the result tool. The zod schema is converted via `z.toJSONSchema()` (Zod 4 native — don't reach for `zod-to-json-schema`). On validation failure, one retry with the error fed back in the prompt.
4. The cleaned HTML is wrapped in `<untrusted_html>` tags and the system prompt explicitly instructs the model not to follow directives inside them (D-022).

## Gotchas worth knowing

- **SQLite path resolution** anchors to `packages/shared`'s install location via `import.meta.url` so cwd doesn't matter. Production overrides via `DB_PATH` env.
- **Next.js needs its own env file.** `.env` at the repo root is loaded by the worker (via `tsx --env-file`), but Next.js only auto-loads from `apps/web/`. The deploy playbook writes `apps/web/.env.local` separately with `DB_PATH`. Without this, the web ends up writing to a different SQLite file than the worker reads.
- **PM2 must point at real JS entry points**, not `node_modules/.bin/*` wrappers. The bin scripts are shell wrappers that PM2 tries to parse as Node. See `deploy/ecosystem.config.cjs` — paths go to `node_modules/next/dist/bin/next` and `apps/worker/node_modules/tsx/dist/cli.mjs`.
- **Corepack on a non-interactive shell** (Ansible, CI) needs `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` or it hangs forever waiting for stdin confirmation when the `packageManager` field pins a different version than what's installed. Already set in the playbook.
- **`better-sqlite3` is a native module.** pnpm 10 blocks build scripts by default; the root `package.json` has `"pnpm": { "onlyBuiltDependencies": ["better-sqlite3"] }` to allow the compile.
- **Server actions returning rich objects** can't be used directly as `<form action={...}>` because Next's type expects `void | Promise<void>`. The pattern in `apps/web/components/SubmitForm.tsx` is a client component that imports the action and calls it inside `startTransition` — keeps the typed return value while preserving form behavior.

## Decision log changes worth flagging

If you find yourself wanting to:
- **Add another runtime, switch SQLite to Postgres, or hoist DB code into the web app** — re-read D-017, D-019, and D-021. We considered and rejected these.
- **Add zod-to-json-schema** — D-012 uses Zod 4's built-in `z.toJSONSchema()` instead.
- **Bypass the queue with synchronous detection** — D-002 + D-009 explain why this stays async.
- **Bolt heuristic detection in front of the LLM call** — D-010 explicitly rejects this; cheerio's role is pre-processing, not detection.
