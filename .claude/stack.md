# Stack

One-page table. Versions track `package.json` at the time of writing; check there for the live state.

| Layer | What | Version | Where it lives / why |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 | [next.config.ts](../next.config.ts) — rewrites `/api/*` to backend |
| UI runtime | React + ReactDOM | 19.2.4 | strict-mode disabled in dev (see config) |
| Language | TypeScript | ^5 | strict, path alias `@/*` → repo root |
| Styling | Tailwind CSS | ^4 | inline config in [tailwind.config.ts](../tailwind.config.ts); design tokens via CSS variables |
| Component library | shadcn/ui (Radix-based) | latest | sources in [components/ui/](../components/ui/); CVA + tailwind-merge for variants |
| Icons | lucide-react | ^1 | one bundle, tree-shaken |
| Theming | next-themes | ^0.4 | `attribute="data-theme"`, default dark, storage key `stx:theme` |
| Animation | framer-motion | ^12 | sparingly — page transitions, AI panel, command palette |
| Data fetching | **swr** (Vercel) | ^2.4 | replaced TanStack Query in May 2026 after upstream incident; see [data-fetching.md](data-fetching.md) |
| Forms | react-hook-form + zod | ^7 / ^4 | RHF + `@hookform/resolvers/zod`; schemas colocated with forms |
| Validation | zod | ^4 | shared with the backend's DTO style |
| Auth | @supabase/supabase-js + @supabase/ssr | ^2 / ^0.10 | SDK in [lib/supabase/client.ts](../lib/supabase/client.ts); cookie-bridging in [lib/supabase/server.ts](../lib/supabase/server.ts) |
| Realtime / SSE | — | — | not used from client yet; backend exposes `/api/events` |
| Analytics | mixpanel-browser | ^2 | identify on sign-in, reset on sign-out — see [lib/analytics.ts](../lib/analytics.ts) |
| Support widget | Intercom (via HMAC hash from backend) | — | `GET /api/integrations/intercom/hash` then bootstrap the widget |
| Toasts | sonner | ^2 | mounted in [app/providers.tsx](../app/providers.tsx); `richColors`, top-right |
| Tooltips | @radix-ui/react-tooltip + shadcn wrapper | — | global provider, `delayDuration: 300` |
| Charts | recharts | ^3 | dashboard + analytics |
| Command palette | cmdk | ^1 | Cmd-K trigger; layered nav + search results |
| Dates | date-fns | ^4 | one-off formatting in [lib/utils.ts](../lib/utils.ts) (`formatDate`, `formatCurrency`) |
| Class composition | clsx + tailwind-merge | ^2 / ^3 | `cn()` helper in [lib/utils.ts](../lib/utils.ts) |
| CVA | class-variance-authority | ^0.7 | shadcn variant API |
| Lint | eslint | ^9 | Next's flat-config preset |
| Test | — | — | no test setup yet |

Backend talked-to: NestJS at `BACKEND_URL` (default `http://localhost:5000`). Routes documented at [server/docs/api-testing.md](../../server/docs/api-testing.md) and the Postman collection.

Supabase project (prod): `lipxxbmiusdluagossxa` — see [server/.claude/](../../server/.claude/) for the backend perspective on it.
