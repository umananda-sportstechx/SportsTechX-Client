# SportsTechX Client — Claude Entry Point

Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 + shadcn/ui + Supabase JS + SWR. Single-tenant SPA-style client for the SportsTechX intelligence platform. Talks to the NestJS backend at `BACKEND_URL` via the rewrite in [next.config.ts](next.config.ts).

## Read first (in order)

1. [.claude/stack.md](.claude/stack.md) — what tech is in play
2. [.claude/domain.md](.claude/domain.md) — business glossary (mirrors server's; client-side lens)
3. [.claude/architecture.md](.claude/architecture.md) — provider stack, App Router layout, request lifecycle
4. [.claude/conventions.md](.claude/conventions.md) — imports, qk usage, form patterns, naming
5. [.claude/rules.md](.claude/rules.md) — hard guardrails (do NOT violate)
6. [.claude/data-fetching.md](.claude/data-fetching.md) — qk + SWR + auth-injection — read before writing fetches
7. [.claude/README.md](.claude/README.md) — index of every file in `.claude/`

## When you need to…

| Task | Go to |
|---|---|
| Add a new page | [.claude/skills/new-page/SKILL.md](.claude/skills/new-page/SKILL.md) |
| Fetch data on a page | [.claude/skills/new-swr-query/SKILL.md](.claude/skills/new-swr-query/SKILL.md) |
| Send a mutation | [.claude/skills/new-swr-mutation/SKILL.md](.claude/skills/new-swr-mutation/SKILL.md) |
| Build a form | [.claude/skills/new-form/SKILL.md](.claude/skills/new-form/SKILL.md) |
| Understand auth flow | [.claude/auth.md](.claude/auth.md) |
| Gate UI by tier | [.claude/feature-gating.md](.claude/feature-gating.md) |
| Look up a route or layout | [.claude/routing.md](.claude/routing.md) |

## Hard rules (full list in [rules.md](.claude/rules.md))

- **Use `qk.*` for every fetch key** — see [lib/query-keys.ts](lib/query-keys.ts). Never pass raw URL strings to `useSWR`.
- **No `@tanstack/react-query` imports.** The package was removed (upstream security incident) and the compat shim (`useQuery` / `useMutation` / `useQueryClient`) has also been deleted. Use native `useSWR` + `useSWRConfig` + `apiRequest` everywhere.
- **All writes go through `apiRequest()`** from [lib/query-client.ts](lib/query-client.ts) so the 401-retry contract stays consistent.
- **Don't instantiate Supabase per-component** — go through [contexts/auth-session-context.tsx](contexts/auth-session-context.tsx) (`useAuthSession`).
- **Page components stay `'use client'`** — this codebase has no RSC data fetching.

## Commands

```bash
npm run dev          # next dev (with 8GB heap)
npm run build        # next build (with 8GB heap)
npm run start        # serve a built bundle
npm run lint         # eslint
npx tsc --noEmit     # typecheck (no script alias yet)
```

Dev server: `http://localhost:3000`. Talks to backend on `BACKEND_URL` (`http://localhost:5000` by default — see [next.config.ts](next.config.ts)).

## Raise UI work (branch `feature/vishnu/raise-ui` and branches made from it)

Frontend-only redesign of Atlas Raise to the Atlas Product UX v3 design. If you are working on Raise:

- **UI only — never change the backend** (server repo, database, migrations, API contracts). If a feature has no backend support yet, build the UI and mark it **Coming soon** (greyed, `soon: true` / SOON pill, not functional).
- **Don't touch `app/(scout)/`** or other products' routes.
- **Build from the Atlas design system** — `import { … } from '@/components/atlas'`. Read [components/atlas/README.md](components/atlas/README.md) first. Colours/fonts only via tokens in `components/atlas/styles/tokens.css`; no hardcoded colours.
- **Where things live:** Raise pages `app/(app)/raise/**`; Raise-only parts `components/raise/**` (sidebar + section tabs in `components/raise/shell-config.ts`); shared features `components/features/**`.
- **Run it locally with no backend (mock mode):** the public Supabase settings come from the committed `.env.development`; create `.env.local` containing just `NEXT_PUBLIC_MOCK_API=1`; then `npm install` and `npm run dev` → http://localhost:3000. `lib/mock-api/` answers every `/api/*` call in the browser; if a page needs an endpoint it lacks, add a route in `lib/mock-api/routes.ts`. Mock mode is off unless that variable is set.
- **Branches:** `feature/vishnu/raise-ui` is the base. Each other person works on their own branch made from it (e.g. Rohn → `feature/rohn/raise-ui`) and pushes only to that branch; Vishnu or Umananda merge it back. At the start of a session `git pull`; when done, commit and push to your own branch (never to `main` / `development`, never to someone else's branch). Never commit `.env.local` or `app/(scout)/`.
- **Before pushing:** `npx tsc --noEmit -p .` must pass and `npx eslint <changed files>` must add no new errors.
- Commit with a clear `feat:` / `fix:` message. Never push to `main` / `development`.
