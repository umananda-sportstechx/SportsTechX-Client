import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/safe-redirect';
import { callPostLogin } from '@/lib/post-login';

/**
 * Is this the account's very first sign-in?
 *
 * Supabase stamps `last_sign_in_at` as part of the exchange we just did, so on
 * a brand-new account it lands within milliseconds of `created_at`; on a
 * returning one `created_at` is days or months behind.
 *
 * This is deliberately NOT `paywall_shown_at IS NULL`, which is the state the
 * onboarding page itself gates on. That column is also null for roughly 2,150
 * pre-existing accounts, so using it here would funnel every one of them into
 * onboarding the next time they signed in with Google. It also needs no
 * database read.
 *
 * Anything we cannot positively confirm is treated as a returning user — the
 * failure we can afford is a new user missing the plan chooser (they can still
 * reach it), not an existing customer being dropped into onboarding.
 */
function isFirstSignIn(user: User | null): boolean {
	if (!user?.created_at || !user.last_sign_in_at) return false;
	const created = Date.parse(user.created_at);
	const signedIn = Date.parse(user.last_sign_in_at);
	if (Number.isNaN(created) || Number.isNaN(signedIn)) return false;
	return Math.abs(signedIn - created) < 10_000;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `startsWith('/')` was the old check; it accepts `//evil.example`. Harmless
  // here only because the result is concatenated onto `origin` below, which
  // keeps it same-origin. Validated properly so that stays true if this is ever
  // refactored to redirect to `next` directly.
  const next = safeRedirect(searchParams.get('redirectTo'));

  if (code) {
    const supabase = await createClient();
    // `data` used to be discarded here, which is what made both bugs below
    // invisible: the user and the session were already in hand.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // The email and password paths both do this before navigating. OAuth did
      // not, so a Google signup never got its signup credits.
      // `BACKEND_URL` is required at build time by next.config, but fall back
      // to this deployment's own origin rather than assume it is also present
      // at runtime: an empty base would make this a relative fetch, which has
      // nothing to resolve against inside a route handler. Going via `origin`
      // just takes the same `/api/*` rewrite the browser uses.
      await callPostLogin(data.session.access_token, process.env.BACKEND_URL || origin);

      // A new account goes to onboarding — the plan chooser and persona step
      // live there, and `redirectTo` defaults to the dashboard, so OAuth
      // signups were skipping both entirely.
      const dest = isFirstSignIn(data.user) ? '/onboarding' : next;
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
