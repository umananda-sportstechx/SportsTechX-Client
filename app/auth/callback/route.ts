import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/safe-redirect';

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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
