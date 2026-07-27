# legacy/ — frozen pre-Atlas frontend (reference only)

Snapshot of the SportsTechX intelligence-platform UI (`app/` routes + `components/`)
as of the Atlas rebrand rebuild. **Not routed, not built, not linted** — excluded in
`tsconfig.json` and `eslint.config.mjs`. Kept purely for reference while the client
is rebuilt fresh against the Atlas raise mock-ups (`client/mock-ups/`).

## Migration plan

- The **plumbing stays live** in the real tree: `lib/`, `hooks/`, `contexts/`,
  `types/`, `middleware.ts`, `app/layout.tsx`, `app/providers.tsx`, `app/globals.css`,
  auth callback. The rebuild reuses these verbatim (SWR + `qk` + `apiRequest`, Supabase
  auth, persona/feature-access/theme contexts).
- The **founder workspace** (`app/(app)/raise/*`) is rebuilt on the Atlas kit
  (`components/atlas/`), founder-first, "as if only founders exist".
- The legacy non-founder routes (dashboard, companies, funding, M&A, reports,
  investors DB, analytics, the investor persona, …) **remain operational** in the live
  tree until each gets an Atlas replacement, then is retired. Nothing is deleted here.
- Do **not** promote the rebuild to production until it is a real, ready replacement.
