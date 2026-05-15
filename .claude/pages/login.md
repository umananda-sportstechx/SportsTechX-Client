# `/login` + `/forgot-password` + `/reset-password`

**Files:**
- [app/(auth)/login/page.tsx](<../../app/(auth)/login/page.tsx>)
- [app/(auth)/forgot-password/page.tsx](<../../app/(auth)/forgot-password/page.tsx>)
- [app/(auth)/reset-password/page.tsx](<../../app/(auth)/reset-password/page.tsx>)

**Purpose:** Unauthenticated entry points. All three use the Supabase JS SDK directly (NOT our backend) — Supabase owns the JWT lifecycle.

## `/login`

### Supabase calls

| Call | Purpose |
|---|---|
| `supabase.auth.signInWithPassword({ email, password })` | sign in existing user |
| `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` | new signup |

### Backend calls (after Supabase succeeds)

| Call | Purpose |
|---|---|
| `POST /api/auth/post-login` with `{ referral_code }` | one-off session bookkeeping (links anonymous claims by email, applies referral if `?ref=` in URL) |

### Flow

1. Form submit → Supabase sign in/up.
2. Supabase sets HttpOnly cookie + emits SIGNED_IN.
3. `AuthSessionProvider` picks it up → `sessionValid` true.
4. `enableQueryPolling()` (reset the polling flag in case of stale logout state).
5. `callPostLogin()` fires `POST /api/auth/post-login`.
6. `router.push('/dashboard')`.

### Referral support

If `?ref=<code>` is in the URL, the code passes through to `POST /api/auth/post-login` body. Backend looks up the referrer and writes a row to `referrals`.

## `/forgot-password`

### Supabase call

`supabase.auth.resetPasswordForEmail(email, { redirectTo: '<origin>/reset-password' })`.

Supabase emits the "recovery" email type → backend's Send Email Hook ([server/src/modules/auth-hooks/](../../../server/src/modules/auth-hooks/)) intercepts → sends our branded email via Resend → user clicks link → Supabase verifies the token → redirects to `/reset-password` with a recovery session.

## `/reset-password`

### Supabase call

`supabase.auth.updateUser({ password })`.

This works only when the user has an active recovery session (from clicking the email link). After success, redirect to `/login?message=password_updated`.

### Gotchas

- **The reset link goes through Supabase's `/auth/v1/verify` endpoint** (not directly to our app). Supabase verifies the token, creates a session, then redirects to `<origin>/reset-password` with the session in the URL fragment. The Supabase JS SDK picks it up via `detectSessionInUrl` (default true).
- **Supabase's URL Configuration → Redirect URLs must include `<origin>/reset-password`** as an allowed pattern (e.g. `http://localhost:3000/**` for dev). Otherwise Supabase rewrites `redirectTo` back to `site_url` and the user lands on the homepage instead of the password form.
- **No frontend route handles the `?token_hash=` PKCE flow** — that's reserved for future verifyOtp work. The current recovery flow uses the older token-based redirect.
- **Don't catch 401 on `/api/auth/post-login`** — the central handler in [lib/query-client.ts](../../lib/query-client.ts) owns redirect-to-login.

## Related to all three

- Centered-card layout from [(auth)/layout.tsx](<../../app/(auth)/layout.tsx>).
- No sidebar, no topbar.
- Inputs use shadcn `<Input>` + `<Label>` directly (no react-hook-form yet — minimal forms).
