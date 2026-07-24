'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { logoutState } from '@/lib/logout-state';
import { enableQueryPolling } from '@/lib/query-client';
import { Loader2, Sun, Moon } from 'lucide-react';
import './../atlas-auth.css';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirectTo') ?? '/dashboard';
  const reason = params.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // True when the URL hash carries a Supabase OTP-expired error — we show
  // an inline "Resend confirmation email" CTA next to the error banner.
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    // Enable query polling on login page mount (recovery after logout)
    if (!logoutState.isLoggingOut()) enableQueryPolling();
    if (reason === 'session_expired') setError('Your session expired. Please sign in again.');

    // Supabase's verify endpoint encodes errors in the URL HASH fragment
    // (e.g. #error=access_denied&error_code=otp_expired&error_description=…).
    // Most commonly this fires because the single-use OTP was consumed by
    // an email link-preview (Gmail/Slack/antivirus all prefetch URLs in
    // mails), so by the time the user actually clicks the link, it's gone.
    // Parse the fragment, show a useful message, and offer a one-click
    // resend instead of leaving them staring at "auth_callback_failed".
    if (typeof window !== 'undefined' && window.location.hash) {
      const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const code = h.get('error_code');
      const desc = h.get('error_description');
      if (code === 'otp_expired') {
        setError('Your confirmation link expired or was already used. Enter your email below and resend it.');
        setShowResend(true);
        // Strip the hash so a reload doesn't keep showing the same message.
        const u = new URL(window.location.href);
        u.hash = '';
        window.history.replaceState({}, '', u.toString());
      } else if (code) {
        setError(desc?.replace(/\+/g, ' ') ?? 'Authentication failed. Please try again.');
        const u = new URL(window.location.href);
        u.hash = '';
        window.history.replaceState({}, '', u.toString());
      }
    }
  }, [reason]);

  const supabase = getSupabaseBrowser();

  const callPostLogin = async (token: string) => {
    try {
      await fetch('/api/auth/post-login', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch { /* non-blocking */ }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); return; }
      if (data.session) {
        await callPostLogin(data.session.access_token);
        router.push(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address first.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError(err.message);
    else setMessage('Password reset email sent!');
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) { setError('Enter the email you signed up with first.'); return; }
    setLoading(true);
    setError('');
    setMessage('');
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
    } else {
      setMessage('New confirmation email sent. Check your inbox.');
      setShowResend(false);
    }
    setLoading(false);
  };

  const signInWith = async (provider: 'google' | 'linkedin_oidc') => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    });
    if (err) setError(err.message);
  };

  return (
    <div className="atlas-auth min-h-dvh flex flex-col items-center justify-center bg-[var(--atlas-page)] px-4 py-10">
      <ThemeToggle />

      <div className="w-full max-w-[420px]">
        <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-card)] px-8 py-9 shadow-sm">
          {/* Wordmark */}
          <div className="mb-6 text-center">
            <div className="text-[17px] font-semibold tracking-tight text-[var(--atlas-ink)]">Atlas</div>
            <div className="mt-0.5 text-[11px] text-[var(--atlas-faint)]">by SportsTechX</div>
          </div>

          <h1 className="text-center text-[19px] font-semibold text-[var(--atlas-ink)]">Log in to your account</h1>
          <p className="mt-1.5 text-center text-[13px] text-[var(--atlas-muted)]">
            Welcome back. Enter your details to continue.
          </p>

          {error && (
            <div className="mt-5 rounded-md border border-[var(--atlas-danger-bd)] bg-[var(--atlas-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--atlas-danger-fg)]">
              {error}
              {showResend && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-[var(--atlas-danger-bd)] px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Resend confirmation email
                </button>
              )}
            </div>
          )}
          {message && (
            <div className="mt-5 rounded-md border border-[var(--atlas-ok-bd)] bg-[var(--atlas-ok-bg)] px-3.5 py-2.5 text-[13px] text-[var(--atlas-ok-fg)]">
              {message}
            </div>
          )}

          {/* SSO */}
          <div className="mt-6 space-y-3">
            <SsoButton onClick={() => signInWith('google')} disabled={loading} label="Continue with Google">
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </SsoButton>
            <SsoButton onClick={() => signInWith('linkedin_oidc')} disabled={loading} label="Continue with LinkedIn">
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              </svg>
            </SsoButton>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--atlas-border)]" />
            <span className="text-[12px] text-[var(--atlas-faint)]">or</span>
            <span className="h-px flex-1 bg-[var(--atlas-border)]" />
          </div>

          {/* Email + password */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-[13px] text-[var(--atlas-muted)]">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="atlas-field"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-[13px] text-[var(--atlas-muted)]">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-[12px] text-[var(--atlas-navy)] hover:underline disabled:opacity-60"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="atlas-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-md bg-[var(--atlas-btn)] text-[14px] font-medium text-[var(--atlas-btn-fg)] transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atlas-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--atlas-card)]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-[var(--atlas-muted)]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[var(--atlas-navy)] hover:underline">Sign up</Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        .atlas-auth .atlas-field {
          width: 100%;
          height: 40px;
          border-radius: 6px;
          border: 1px solid var(--atlas-input);
          background: var(--atlas-field);
          padding: 0 12px;
          font-size: 13px;
          color: var(--atlas-ink);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .atlas-auth .atlas-field::placeholder { color: var(--atlas-faint); }
        .atlas-auth .atlas-field:focus-visible {
          border-color: var(--atlas-navy);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--atlas-navy) 22%, transparent);
        }
      `}</style>
    </div>
  );
}

function SsoButton({
  onClick, disabled, label, children,
}: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-[40px] w-full items-center justify-center gap-2.5 rounded-md border border-[var(--atlas-input)] bg-[var(--atlas-field)] text-[13px] text-[var(--atlas-ink)] transition-colors hover:bg-[var(--atlas-field-hover)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atlas-navy)]"
    >
      {children}
      {label}
    </button>
  );
}

/** Small light/dark toggle so both themes are reachable on the pre-login screen. */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="fixed right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-card)] text-[var(--atlas-muted)] hover:text-[var(--atlas-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atlas-navy)]"
    >
      {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
    </button>
  );
}
