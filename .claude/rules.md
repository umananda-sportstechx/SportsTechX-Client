# Hard Rules

Non-negotiable. Violations break security, observability, or the auth contract.

## Data fetching

- **Never `import` anything from `@tanstack/react-query`.** The package was removed after an upstream security incident, and the compat shim that briefly mirrored its API (`useQuery` / `useMutation` / `useQueryClient`) has also been deleted. Use `useSWR` + `useSWRConfig` + `apiRequest` directly. Why: prevents the compromised dep tree from sneaking back in via a transitive add. **How to apply:** any new fetch call uses `useSWR`; any write uses `apiRequest` + inline `useState`.
- **Never call `useSWR` with a raw URL string.** Use `qk.*` from [lib/query-keys.ts](../lib/query-keys.ts). Why: keys participate in cache identity; raw strings mean repeated requests for the same logical resource land in separate cache slots, breaking dedup and invalidation.
- **Never call `fetch()` directly for write operations.** Go through `apiRequest()` from [lib/query-client.ts](../lib/query-client.ts). Why: `apiRequest` implements the 401 → refresh → retry contract; per-component `fetch` skips it and leads to unrecoverable session expiry.
- **Never read JWT from `localStorage`.** Go through `getAuthHeaders()`. Why: the token-cache invariant lives there.

## Auth

- **Never instantiate Supabase via `getSupabaseBrowser()` inside a component.** Use `useAuthSession()` from [hooks/use-auth-session.ts](../hooks/use-auth-session.ts). Why: the singleton Provider owns the only `onAuthStateChange` subscription — extra subscribers cause N× refetch fan-out.
- **Never bypass `ProtectedRoute` / the `(app)` layout gate** to render a logged-in page. Why: the layout owns the redirect-on-unauthenticated flow; bypassing leaves protected data exposed during the brief window before the redirect fires.
- **Always call `disableQueryPolling()` and `mutate(() => true, undefined, { revalidate: false })` BEFORE `supabase.auth.signOut()`** on hard logout. Why: order matters — pending requests with the old token will 401 mid-logout and trigger a redirect-to-login that races with the actual sign-out. `disableQueryPolling()` from [lib/query-client.ts](../lib/query-client.ts) gates the fetcher; the global `mutate` (imported from `swr`) drops cached entries.

## Feature gating

- **Never disable `useFeatureAccess()` gates in dev to make a query work.** If a page can't access a feature, the right answer is to upgrade the test user's tier (or admin them), not to silence the gate. Why: gates absent in dev let bad calls through to production where they hit a real tier check.
- **The `admin` role bypasses every tier gate** (by design — see [contexts/feature-access-context.tsx](../contexts/feature-access-context.tsx)). Don't add tier checks BEFORE the admin bypass — they'll be unreachable for admins.

## Routing

- **All pages stay `'use client'`.** This codebase has no RSC data fetching. Why: every page reads from `useSWR`/`useAuthSession`, both of which require a client boundary.
- **Layouts that consume cookies need `export const dynamic = 'force-dynamic'`.** Otherwise Next.js statically renders them at build time with empty cookies. The `(app)/layout.tsx` already has this — don't remove it.
- **Don't add route handlers (`route.ts`) for data fetching.** Use the backend; the `/auth/callback` route is an exception because it has to run server-side for the OAuth code exchange.

## Components

- **shadcn primitives only via `@/components/ui/*`.** Don't import directly from `@radix-ui/*` — wrap it in [components/ui/](../components/ui/) first if a new primitive is needed. Why: variants + classNames are defined in the wrapper.
- **Forms use react-hook-form + zod + the shadcn `<Form>` wrapper.** No raw `<form>` for anything non-trivial. Why: accessibility + error state is baked into the wrapper.

## Logging & PII

- **Don't `console.log` JWTs, refresh tokens, or session cookies** even in dev. They get scraped by source maps in prod.
- **Don't pass user email/display_name into URL query params.** Mixpanel `identify()` is the only sanctioned PII path.

## Environment

- **Client-readable env vars must be prefixed `NEXT_PUBLIC_`.** Next.js's hard rule, not ours.
- **`BACKEND_URL` is server-only** — defined in [next.config.ts](../next.config.ts) and not exposed to the browser. The browser always hits same-origin `/api/*`, which Next.js proxies.

## Things to ask before doing

- Adding a new top-level provider in `app/providers.tsx`.
- Changing the order of providers — the current order is intentional (see [architecture.md](architecture.md)).
- Replacing `swr` with another data-fetching library.
- Reintroducing TanStack-shaped helper hooks. The compat shim was removed deliberately; if a similar abstraction is needed, design it from scratch rather than recreating the old shape.
- Adding a new top-level route group (`(name)`).
