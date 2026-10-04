# Mock API

Lets the client run with **no backend**: when `NEXT_PUBLIC_MOCK_API=1`, every
browser `/api/*` call is answered from fixtures. Supabase login still goes to
Supabase. **Off by default** — with the variable unset the app talks to the real
backend as normal, so this is inert in local dev and production unless switched on.

Used by the Raise UI branch while the shared backend/DB was being migrated
(Oct 2026), and by the preview site https://atlas-raise-preview.vercel.app (the
variable is set on that Vercel project only).

- **On/off locally:** add `NEXT_PUBLIC_MOCK_API=1` to `.env.local` and restart `npm run dev`.
- **Hook:** `instrumentation-client.ts` (repo root) imports this folder, which wraps `window.fetch`.
- **Public data:** `fixtures/captured.json` — real public API responses snapshotted by
  `node lib/mock-api/capture.mjs` (needs the backend running). Contact/internal fields are stripped.
- **Logged-in data:** `seed.ts` (profile, raise, watchlist, pitch deck, chat, billing, company watchlists).
  Writes persist in the browser's localStorage; reset with `window.__stxMockReset()` in the console.
- **Missing endpoint:** the console logs `[mock-api] not mocked: …` — add a route in `routes.ts`.

**Remove when no longer needed:** delete `lib/mock-api/` and `instrumentation-client.ts`.
