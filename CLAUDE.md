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

- **Use `qk.*` for every fetch key** — see [lib/query-keys.ts](lib/query-keys.ts). Never pass raw URL strings to `useSWR` or `useQuery`.
- **No direct `@tanstack/react-query` imports.** The package has been removed (security incident upstream). The TanStack-shaped hooks (`useQuery`, `useMutation`, `useQueryClient`) now live in [lib/query-client.ts](lib/query-client.ts) and are SWR-backed shims for migration compatibility. New code should prefer `useSWR` directly.
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
