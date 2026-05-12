# Get Covered — AI Engineer Assessment

A small web app that takes a URL, renders the page, and uses Claude to identify and return the HTML markup of its authentication component (username/password form, magic-link input, SSO button, etc.).

**Live demo:** https://get-covered-assessment.10xdev.io

---

## How it works

1. Submit a URL via the form on the home page.
2. The job is enqueued in SQLite.
3. A background worker claims the job, renders the page with Playwright (waiting for any JS-rendered UI to settle), strips noise from the HTML with cheerio, and asks Claude Haiku 4.5 to identify the auth component via a structured tool call.
4. The result — HTML snippet, auth type (`password` / `magic-link` / `sso` / `oauth` / `multi-step` / `unknown`), and a short description — is written back to the job row.
5. The UI polls `/api/jobs` and updates the accordion list in place.

If no authentication component is found on the page, the job completes with an explicit "no auth component found" result rather than failing.

## Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind v4
- **Backend**: Node.js worker via `tsx`; PM2 in production
- **Database**: SQLite (`better-sqlite3`, WAL mode)
- **Browser automation**: Playwright Chromium with minimal stealth (custom UA, viewport, `navigator.webdriver` patches)
- **AI**: Claude Haiku 4.5 via the Anthropic SDK, using tool use with a zod-derived JSON schema
- **Validation**: Zod 4 (single source of truth for both the form input and the model output)
- **Deployment**: Ansible playbook → PM2 → nginx on a VPS

## Local development

Requires Node 22+, pnpm 10+, and an Anthropic API key.

```bash
pnpm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Terminal 1: web on http://localhost:3002
pnpm run dev:web

# Terminal 2: the worker (loads .env from the repo root)
pnpm run start:worker
```

Then submit a URL via the form. Try `https://github.com/login` or `https://news.ycombinator.com/login` for quick smoke tests.

## Verified examples

Run against the live demo across the site categories called out in the assessment brief:

| Category   | URL                                  | Detected auth type | Snippet returned          |
| ---------- | ------------------------------------ | ------------------ | ------------------------- |
| SaaS       | `https://vercel.com/login`           | `multi-step`       | Yes                       |
| Dev tools  | `https://github.com/login`           | `multi-step`       | Yes                       |
| Community  | `https://stackoverflow.com/users/login` | `password`      | Yes                       |
| News       | `https://news.ycombinator.com/login` | `password`         | Yes                       |
| Publishing | `https://substack.com/sign-in`       | `magic-link`       | Yes                       |
| Video      | `https://youtube.com`                | `sso`              | Yes                       |
| Marketing  | `https://10xdev.io`                  | `unknown`          | No — correctly reports "no authentication component found" |

## Project layout

```
apps/
├── web/              # Next.js app
└── worker/           # Long-running queue worker (Playwright + Claude)
packages/
└── shared/           # zod schemas, SQLite layer, Job types
deploy/               # Ansible playbook, nginx config, PM2 ecosystem
docs/
├── decisions.md      # 23-entry decision log explaining every architectural choice
└── plan.md           # Six-phase implementation roadmap
CLAUDE.md             # Notes for Claude Code agents working in this repo
```

## Where to look for "why"

The `docs/decisions.md` file contains 23 ADR-style entries explaining every non-trivial architectural choice — the queue model, the detection pipeline, the SSRF guard, why Claude does detection (and not heuristics), why we wrap untrusted HTML in delimiters, and so on. It also records what was considered and rejected. Start there if a design choice seems surprising.

## Security notes

- URL input is validated against a SSRF allowlist (HTTPS/HTTP only; private/loopback ranges rejected).
- Untrusted HTML from third-party sites is wrapped in `<untrusted_html>` delimiters before being sent to Claude, and the system prompt explicitly instructs the model not to follow any instructions found inside.
- The structured tool-use output is validated with zod at runtime, with one retry feeding the validation error back to the model.
- No authentication on the demo URL itself — anyone with the link can submit jobs. The single-worker queue bounds throughput (and thus API spend) regardless of submission volume.
