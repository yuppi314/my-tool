# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A freemium fortune-telling web app (Japanese: 九星気学 × マヤ暦 診断ツール — "Nine Star Ki × Mayan Calendar diagnosis tool"). Given a birthdate, it computes a Nine Star Ki "honmei star" and a Mayan Dreamspell KIN/seal/tone, then monetizes via:

- Free diagnosis that captures email leads (`leads` table)
- A one-time paid "detailed report" via Stripe Checkout (`REPORT_PRICE_JPY`, mock mode if `STRIPE_SECRET_KEY` is unset)
- A compatibility ("相性診断") feature gated behind purchase
- A token-protected admin stats page (`/admin.html`, `ADMIN_TOKEN`)

The codebase (comments, UI copy, commit-worthy strings) is in Japanese; keep new user-facing strings and code comments in Japanese to match the existing style.

## Commands

```bash
npm install          # install dependencies
npm start            # run the server (node src/server.js)
npm run dev           # run with --watch (auto-restart on file change)
cp .env.example .env  # required before first run — server reads process.env directly, no defaults for most keys
```

There is no test suite, lint config, or build step in this repo — don't invent npm scripts for them.

Server listens on `PORT` (default 3000). Health check: `GET /health`.

### Docker (for persistent-disk / production deployment)

```bash
docker build -t kyusei-mayan-fortune .
docker run -p 3000:3000 -v $(pwd)/data:/app/data --env-file .env kyusei-mayan-fortune
```

SQLite data lives in `/app/data` inside the container (`data/app.db` locally) — must be a mounted volume for persistence. Deploys via `render.yaml` (Render.com); the free plan has no persistent disk, so leads/diagnoses reset on redeploy/restart there.

## Architecture

**Stack**: Express + better-sqlite3 (synchronous, no ORM) + vanilla HTML/CSS/JS frontend (no bundler/framework). `src/server.js` is the composition root: it wires middleware and mounts every route module under `/api`.

**Request flow**: `public/*.html` + `public/js/*.js` call the JSON API directly via `fetch` — there's no server-side templating. `index.html`/`app.js` is the free-diagnosis form; `result.html`/`result.js` polls `/api/diagnosis/:id`, conditionally unlocks the paid view, and drives checkout + compatibility.

**Domain logic lives in `src/lib/`, independent of Express/DB**:
- `kyusei.js` — Nine Star Ki: computes the "honmei star" (立春/Feb-4 is the year cutover, not Jan 1), five-element (五行) relations, and the 9-year fortune cycle phase.
- `mayan.js` — Mayan Dreamspell KIN: day-count from a fixed epoch (`Date.UTC(1900,0,1)` = KIN 30) mod 260, deriving the 20 solar seals and 13 galactic tones.
- `content.js` — combines a `kyusei` + `mayan` result into a `profile`, then renders free vs. full (paid) text blocks. `computeProfile(dateStr)` is the single entry point other modules should call rather than reaching into `kyusei`/`mayan` directly.
- `compatibility.js` — combines two profiles' element relation (相生/相剋 generating/controlling cycle) + KIN difference into a compatibility score/text.

These calculation modules implement publicly documented, generic algorithms (not a proprietary school's method) — see README for the specific epoch/date derivations if algorithm behavior needs to change.

**Routes (`src/routes/`, all mounted at `/api`)**:
- `diagnosis.js` — `POST /diagnosis` (create + save lead), `GET /diagnosis/:id` (free result), `GET /diagnosis/:id/full` (paid; 402 if `!paid`)
- `payment.js` — `POST /checkout` (Stripe Checkout session, or mock-mode instant-paid if `STRIPE_SECRET_KEY` unset) and the raw-body Stripe webhook handler (exported separately, mounted in `server.js` *before* `express.json()` since Stripe signature verification needs the raw body)
- `compatibility.js` — `POST /compatibility`, requires the base diagnosis to be `paid`
- `admin.js` — `GET /admin/stats`, guarded by comparing `?token=`/`x-admin-token` header against `ADMIN_TOKEN`

**Persistence** (`src/db.js`): a single better-sqlite3 connection with schema created via `CREATE TABLE IF NOT EXISTS` on startup (no migration framework). Three tables: `leads`, `diagnoses` (has the `paid` flag that gates the full report and compatibility routes), `orders` (Stripe session/status tracking). Data dir is `data/` relative to `src/`, auto-created if missing.

**Payment mock mode**: whenever `STRIPE_SECRET_KEY` is not set, `getStripe()` in `payment.js` returns `null` and checkout immediately marks the diagnosis `paid` and inserts an `orders` row with status `paid_mock` — this is the default/demo behavior, not an error path. Keep this working when touching `payment.js`.

## Legal/content notes

`public/tokushoho.html`, `terms.html`, `privacy.html` are templates with placeholders (e.g. `[事業者名を記入してください]`) that must be filled in with real business info before any real deployment — don't remove the placeholder-style structure when editing them.
