'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { logoutState } from '@/lib/logout-state';
import { Brand } from '@/components/ui/brand';
import { enableQueryPolling } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { Loader2, Mail, Lock } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-sidebar-background text-sidebar-foreground w-2/5 p-12">
        <div className="max-w-sm text-center">
          {/* Sidebar panel is dark — use the white wordmark directly. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stx_white_horizontal.png" alt="SportsTechX" className="mx-auto mb-6 h-12 w-auto" />
          <p className="text-sidebar-foreground/80 text-lg leading-relaxed">
            The global platform for sports technology intelligence. Discover companies, investors, and deals shaping the future of sport.
          </p>
        </div>
      </div>

      {/* Right panel - sign-in form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <Brand variant="horizontal" height={36} className="mx-auto" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Sign in to your SportsTechX account</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {error}
                  {showResend && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendConfirmation}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Resend confirmation email
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {message && (
                <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                  {message}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <Button type="button" variant="link" className="w-full text-muted-foreground" onClick={handleForgotPassword} disabled={loading}>
                  Forgot password?
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>

              <OAuthButtons redirectTo={redirectTo} onError={setError} disabled={loading} />

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary underline-offset-4 hover:underline">Sign up</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
