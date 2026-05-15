# Architecture

Next.js App Router with a single client-side SPA-style shell. No RSC data fetching — every page is `'use client'`.

## Provider stack (top → bottom)

Order matters; each layer below depends on something above it. Defined in [app/providers.tsx](../app/providers.tsx).

```
SWRConfig                    ← global fetcher, dedup, retry, 401-refresh path
  ThemeProvider              ← next-themes, default dark, attribute=data-theme
    TooltipProvider          ← Radix tooltip, delayDuration=300
      AuthSessionProvider    ← singleton Supabase session subscription
        FeatureAccessProvider← reads useUserProfile + GET /api/features; gates UI by tier
          MobileNavProvider  ← mobile sidebar open/close
            <AppInit />      ← initAnalytics, identify(profile) once on sign-in
            { children }     ← page tree
            <Toaster />      ← sonner, top-right
```

### Why `AuthSessionProvider` wraps `FeatureAccessProvider`

`FeatureAccessProvider` reads `sessionValid` and `loading` from `useAuthSession()` to gate its own `GET /api/features` fetch. Reversing the order would render the gate against an undefined session.

### Why one Supabase session subscription, not per-component

Pre-`AuthSessionProvider`, every component calling `supabase.auth.onAuthStateChange()` registered its own listener. On the synthetic SIGNED_IN event Supabase emits on subscribe + on every token refresh, each subscriber invalidated `qk.profile()`, fanning out to 15+ sequential refetches per refresh. The Provider owns one subscription and broadcasts state via context — see comments inside [contexts/auth-session-context.tsx](../contexts/auth-session-context.tsx).

## App Router layout

```
app/
├── layout.tsx                  ← root: html/body wrapper, mounts <Providers>
├── providers.tsx               ← the stack above
├── (app)/                      ← protected route group (logged-in shell)
│   ├── layout.tsx              ← AppShell — sidebar + topbar + main; force-dynamic
│   ├── dashboard/page.tsx
│   ├── companies/{page.tsx, [slug]/page.tsx}
│   ├── investors/page.tsx
│   ├── deals    → funding/page.tsx
│   ├── ma/page.tsx
│   ├── ecosystem/page.tsx + events/page.tsx + programs/page.tsx
│   ├── reports/page.tsx
│   ├── analytics/page.tsx       ← pro-only
│   ├── admin/page.tsx           ← admin-only
│   ├── settings/page.tsx
│   ├── subscriptions/page.tsx
│   ├── api-keys/page.tsx
│   ├── integrations/page.tsx
│   ├── chat/[id]/page.tsx       ← SSE stream
│   ├── saved-searches/page.tsx
│   ├── newsletter/page.tsx
│   ├── framework/page.tsx
│   └── success/page.tsx
├── (auth)/                     ← unprotected
│   ├── layout.tsx              ← centered card frame
│   ├── login/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── auth/callback/route.ts      ← OAuth code-exchange handler (Supabase callback)
├── privacy-policy/page.tsx     ← public static
└── terms-of-service/page.tsx   ← public static
```

Route group `(app)` shares a layout (the AppShell); `(auth)` shares a different one. The parentheses don't appear in URLs — `(app)/dashboard` is just `/dashboard`.

## Request lifecycle

1. **Browser hits `/companies`** (or any `(app)/*` route).
2. **Middleware** ([middleware.ts](../middleware.ts)) — Supabase SSR runs first to refresh the auth cookie if needed.
3. **`(app)/layout.tsx`** wraps the page in the AppShell.
4. **Page component renders** with `'use client'`.
5. Hook calls `useSWR(qk.companies.list(params))`.
6. **`fetcher` in [lib/query-client.ts](../lib/query-client.ts)** runs:
   - Pulls JWT via `getAuthHeaders()` (cached for 60s before expiry).
   - Calls `fetch('/api/companies?...')` with `Authorization: Bearer <jwt>`.
   - On 401, awaits `sessionRefreshLock.acquireAndRefresh()`; retries once with fresh token.
7. **Next.js rewrite** in [next.config.ts](../next.config.ts) sends `/api/*` to `BACKEND_URL/api/*`.
8. **Backend** responds; SWR caches by tuple key.
9. Component re-renders with `data`.

## SWR config flow

`swrConfig` (top-level) → individual `useSWR` call → inherits defaults, overrides specific options. The shared `fetcher` is the only path the network knows about, so auth and 401 retry are guaranteed everywhere.

Global defaults (set in [lib/query-client.ts](../lib/query-client.ts)):
- `dedupingInterval: 5 * 60_000` (5 min) — repeat reads within this window return cached data without refetching.
- `revalidateOnFocus: false` — don't refetch on window focus.
- `revalidateOnReconnect: false`.
- `errorRetryCount: 2`; `shouldRetryOnError` skips on 404.
- `keepPreviousData: true` — paginated lists don't flash blank during page change.

## Auth lifecycle (compressed)

Full detail: [auth.md](auth.md).

```
sign in (Supabase JS)
   ↓
session cookie set (middleware bridges to Next.js)
   ↓
AuthSessionProvider broadcasts sessionValid=true
   ↓
useUserProfile fetches /api/me → SWR caches qk.profile()
   ↓
POST /api/auth/post-login (one-off bookkeeping, links anonymous claims)
   ↓
identify() to Mixpanel
   ↓
gated UI unlocks based on FeatureAccessProvider's checkAccess(slug)
```

On token expiry (typically 1h):
- Any request from `useSWR` → backend returns 401 → fetcher's retry path calls `sessionRefreshLock.acquireAndRefresh()` → Supabase rotates the token → fetch retries once → success.
- The lock prevents N parallel refresh calls when N requests fire at once.

On sign-out:
- `disableQueryPolling()` flips the fetcher's `pollingDisabled` flag and clears all SWR cache.
- `supabase.auth.signOut()` clears the Supabase cookie.
- `router.push('/login')`.

## Anti-patterns to avoid

- Calling `getSupabaseBrowser()` inside a component to read the session — use `useAuthSession()` instead.
- Building URL strings inline for `useSWR` — use `qk.*` so keys participate in cache identity correctly.
- Adding a new Provider — first ask whether existing context can carry the state.
- Marking a page server-side — this codebase has no RSC data fetching; pages are `'use client'`.
