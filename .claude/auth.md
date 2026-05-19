# Auth

How sign-in, token refresh, and sign-out work in this client. The cohesive picture lives across three files: [contexts/auth-session-context.tsx](../contexts/auth-session-context.tsx), [hooks/use-auth-session.ts](../hooks/use-auth-session.ts), and [lib/query-client.ts](../lib/query-client.ts).

## Identity model

- **Supabase owns the JWT.** Signed-in users hold a Supabase `access_token` (1h TTL) + `refresh_token`. Both live in HttpOnly cookies set by Supabase JS + the SSR cookie bridge in [lib/supabase/server.ts](../lib/supabase/server.ts).
- **The backend verifies the JWT locally** against the Supabase JWKS — no per-request round-trip to Supabase. See [server/.claude/modules/core/auth.md](../../server/.claude/modules/core/auth.md).
- **The client never decodes the JWT.** It reads `session.user` from the SDK and trusts the backend's `/api/me` response for tier / role / display fields.

## The singleton subscription

`AuthSessionProvider` ([contexts/auth-session-context.tsx](../contexts/auth-session-context.tsx)) holds exactly one `supabase.auth.onAuthStateChange()` listener for the whole app. Why this matters:

Supabase emits a synthesised `SIGNED_IN` event when a subscriber attaches AND on every token refresh. Pre-Provider, 15+ components each subscribed → each invalidated `qk.profile()` → 15× refetch fan-out per token refresh. The Provider fixes this by:

1. Subscribing once on mount.
2. Maintaining `{ user, loading, sessionValid }` state.
3. Broadcasting via context — components consume it via `useAuthSession()`.
4. Only the Provider invalidates `qk.profile()` (debounced to first SIGNED_IN after subscription, then on every actual refresh).

**Rule:** never call `getSupabaseBrowser().auth.onAuthStateChange(...)` outside the Provider.

## Sign-in flow

```
User submits credentials in (auth)/login/page.tsx
    ↓
supabase.auth.signInWithPassword({ email, password })
    ↓
Supabase sets HttpOnly cookie + returns session
    ↓
AuthSessionProvider's listener fires SIGNED_IN
    ↓
sessionValid → true
    ↓
useUserProfile fetches /api/me (qk.profile())
    ↓
POST /api/auth/post-login (one-off bookkeeping: links anonymous claims, applies referral code if present)
    ↓
identify() to Mixpanel
    ↓
router.push('/dashboard')
```

The post-login call is idempotent on the server (safe to retry). It's NOT called on every page load — only once per session, gated by `if (!logoutState.isLoggingOut()) enableQueryPolling()` (see [app/(auth)/login/page.tsx](<../app/(auth)/login/page.tsx>)).

## Token refresh

Supabase tokens expire after 1 hour. The fetcher in [lib/query-client.ts](../lib/query-client.ts) handles refresh transparently:

```
Component → useSWR → fetcher → fetch /api/* with Bearer <jwt>
    ↓ (server returns 401)
sessionRefreshLock.acquireAndRefresh()
    ↓ (Supabase rotates the token)
fetch /api/* again with the new Bearer
    ↓
component sees fresh data
```

**Why the lock matters:** if 5 SWR queries fire at the same moment and all 401, each would call `supabase.auth.refreshSession()` independently → Supabase rate-limits + only one refresh actually succeeds → races. The lock guarantees ONE refresh; the other four callers await its result.

The lock lives at [lib/session-refresh-lock.ts](../lib/session-refresh-lock.ts) — module-level singleton. Don't replace.

## Sign-out (hard logout)

Order is load-bearing. From [components/sidebar.tsx](../components/sidebar.tsx) / [components/app-header.tsx](../components/app-header.tsx):

```ts
async function handleSignOut() {
  logoutState.setLoggingOut(true);    // tells fetcher to short-circuit auth header
  const { disableQueryPolling } = await import('@/lib/query-client');
  const { mutate } = await import('swr');
  disableQueryPolling();              // stop new fetches via the gated fetcher
  await mutate(() => true, undefined, { revalidate: false }); // drop SWR cache
  await getSupabaseBrowser().auth.signOut();
  router.push('/login');
}
```

**Why this order:**
1. `setLoggingOut(true)` first — prevents `getAuthHeaders()` from returning the soon-to-be-stale token.
2. `disableQueryPolling()` second — stops any in-flight request from racing with the cookie clear.
3. `mutate(() => true, undefined, { revalidate: false })` third — drops cached profile, features, etc. so a fast re-login starts fresh.
4. `signOut()` fourth — Supabase invalidates the refresh token server-side.
5. `router.push('/login')` last.

Reordering any pair leaks: e.g. signing out before clearing the cache leaves stale profile data visible during the redirect transition; clearing the cache before disabling polling triggers a refetch with the about-to-be-revoked token.

## Soft session expiry

If a refresh fails (refresh token also expired, or Supabase rejects it), `handleResponse()` in [lib/query-client.ts](../lib/query-client.ts) schedules `window.location.href = '/login?reason=session_expired'` after 1.5s. The delay gives any in-flight transitions time to complete; the query string tells the login page to render a "your session expired" banner.

Do **not** catch 401 / 403 per-component — the central handler owns this path. Catching it leaves the user in a stuck UI.

## OAuth (Google, etc.)

Currently not wired. The route handler at [app/auth/callback/route.ts](../app/auth/callback/route.ts) is in place for `?code=<pkce>` exchange but no provider buttons exist on `(auth)/login/page.tsx`. When adding one:

1. Call `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: \`${origin}/auth/callback?redirectTo=/dashboard\` } })`.
2. The callback route exchanges the code for a session via `supabase.auth.exchangeCodeForSession(code)`.
3. Same SIGNED_IN path runs from there.

## Verification endpoints (email confirm, password reset, magic link)

These go through Supabase's `/auth/v1/verify` endpoint via the **Send Email Hook** the backend implements. See [server/.claude/modules/features/auth-routes.md](../../server/.claude/modules/features/auth-routes.md) and the auth-hook source at `server/src/modules/auth-hooks/`. Client side:

- **Password reset:** `(auth)/forgot-password/page.tsx` → calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '${origin}/reset-password' })`. The user clicks the email link → Supabase verifies + redirects → `(auth)/reset-password/page.tsx` shows the new-password form → calls `supabase.auth.updateUser({ password })`.
- **Email verification:** same pattern; the link redirects to `/auth/confirm` (TBD; route doesn't exist yet in this client).

## Test-account hygiene

`is_test_account: true` profiles bypass certain analytics / billing flows server-side. The currently-shipped admin account (`vishnu+admin@sportstechx.com`) has this flag set — useful for hitting paid routes without polluting real data. See observation O13 in [server/api-test-findings-log.docx](../../server/api-test-findings-log.docx).
