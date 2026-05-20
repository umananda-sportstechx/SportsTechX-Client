# SportsTechX Client — Setup

User-facing intelligence platform. Next.js 16 + React 19 + TypeScript + SWR + shadcn/ui + Supabase JS. Talks to the NestJS backend via the `/api/*` rewrite. Runs on port **3000**.

> **The comprehensive multi-repo guide (server + client + admin + git workflow + migrations) lives at [`SportsTechX-Services/SETUP.md`](https://github.com/umananda-sportstechx/SportsTechX-Services/blob/development/SETUP.md).** This file covers just the client-specific bits.

---

## Prerequisites

- Node.js 20+ and npm 10+
- Git, with SSH access to the [`umananda-sportstechx`](https://github.com/umananda-sportstechx) org
- The backend running locally on `http://localhost:5000` (or a remote `BACKEND_URL`)

## Clone

```bash
git clone git@github-work:umananda-sportstechx/SportsTechX-Client.git client
cd client
```

## Environment variables

Create `client/.env.local` (gitignored). Next.js reads `.env.local`, NOT `.env`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-dashboard>
BACKEND_URL=http://localhost:5000
```

Optional (only set if you're working on the related feature):

```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_INTERCOM_APP_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

Ask a team lead for dev values — never use prod Supabase from your laptop.

## Install + run

```bash
npm install
npm run dev          # serves on http://localhost:3000
```

The dev server allocates 8GB of heap (Next 16 + Turbopack is memory-hungry on cold compile). If you see OOM crashes, close other apps or bump the heap further in `package.json`.

Auth gate: every page under `app/(app)/` requires a signed-in Supabase session. Hit `/login` to sign up / sign in.

## Build & verify before pushing

```bash
npx tsc --noEmit     # type-check only (fastest)
npm run lint         # eslint
npm run build        # full production build (8GB heap)
```

All three must exit 0. CI runs the same checks — catching them locally saves the round-trip.

## Architecture quick-links

The client has its own `.claude/` docs ([client/.claude/](.claude/)) covering:

- [stack.md](.claude/stack.md) — every dependency, what it's for
- [architecture.md](.claude/architecture.md) — provider tree, route groups, auth lifecycle
- [rules.md](.claude/rules.md) — hard guardrails (do NOT violate)
- [data-fetching.md](.claude/data-fetching.md) — SWR + `qk.*` + auth-injection + 401 retry contract
- [auth.md](.claude/auth.md) — `AuthSessionProvider`, refresh lock, hard logout
- [feature-gating.md](.claude/feature-gating.md) — tier gates + admin bypass
- [pages/](.claude/pages/) — per-page surface index

Read [CLAUDE.md](CLAUDE.md) first — it has the routing into all of the above.

## Git workflow

See [`SportsTechX-Services/SETUP.md` § 9](https://github.com/umananda-sportstechx/SportsTechX-Services/blob/development/SETUP.md#9-git-workflow) for the full picture. TL;DR:

1. Branch off `development`:
   ```bash
   git checkout development && git pull origin development
   git checkout -b feature/<your-name>/<short-topic>
   ```
2. Commit logically, push your branch:
   ```bash
   git push -u origin feature/<your-name>/<short-topic>
   ```
3. **Before pushing**, pull development again and merge it in:
   ```bash
   git fetch origin && git merge origin/development
   # resolve conflicts if any, rebuild locally, then push
   ```
4. Open PR ladder on GitHub:
   - `feature/<you>/<topic>` → `development` (you open this)
   - `development` → `staging` (release manager opens this)
   - `staging` → `main` (release manager opens this, deploys to prod)

Never force-push to `main` / `staging` / `development`. Never commit directly to them.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot find module 'BACKEND_URL'` | Missing `.env.local`. See above. |
| Pages don't load data, console shows 401 / 403 | Server isn't running, or `BACKEND_URL` is wrong, or your Supabase session expired (sign in again). |
| "Module not found" after `git pull` | `node_modules/` is stale. Re-run `npm install`. |
| OOM during `npm run build` | Bump heap in `package.json`: `--max-old-space-size=12288`. |
| Tier-gated page shows lock screen but you have a paid tier | Backend's `user_type` for your profile isn't right. Hit `GET /api/profiles/me` to verify; ask a team lead to bump it via the admin panel. |
| Auth keeps redirecting to `/login` | Check `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` match your Supabase project. They must be the **anon** key, not service-role. |
