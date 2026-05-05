'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { logoutState } from '@/lib/logout-state';
import { enableQueryPolling } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Lock, User, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria','Belgium','Brazil','Canada',
  'Chile','China','Colombia','Czech Republic','Denmark','Egypt','Ethiopia','Finland','France',
  'Germany','Ghana','Greece','Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Japan','Jordan','Kenya','Malaysia','Mexico','Morocco','Netherlands','New Zealand',
  'Nigeria','Norway','Pakistan','Peru','Philippines','Poland','Portugal','Romania','Russia',
  'Saudi Arabia','Senegal','Singapore','South Africa','South Korea','Spain','Sri Lanka',
  'Sweden','Switzerland','Thailand','Turkey','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Venezuela','Vietnam','Zimbabwe',
];

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirectTo') ?? '/dashboard';
  const reason = params.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    // Enable query polling on login page mount (recovery after logout)
    if (!logoutState.isLoggingOut()) enableQueryPolling();
    if (reason === 'session_expired') setError('Your session expired. Please sign in again.');
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: company,
            job_title: jobTitle,
            country,
          },
        },
      });
      if (err) { setError(err.message); return; }
      if (data.user && !data.session) {
        setMessage('Check your email for a confirmation link!');
      } else if (data.session) {
        await callPostLogin(data.session.access_token);
        router.push(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}` },
    });
    if (err) { setError(err.message); setLoading(false); }
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

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-sidebar-background text-sidebar-foreground w-2/5 p-12">
        <div className="max-w-sm text-center">
          <h1 className="text-5xl font-display tracking-wider text-sidebar-primary mb-6">
            SPORTSTECHX
          </h1>
          <p className="text-sidebar-foreground/80 text-lg leading-relaxed">
            The global platform for sports technology intelligence. Discover companies, investors, and deals shaping the future of sport.
          </p>
        </div>
      </div>

      {/* Right panel - auth forms */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <h1 className="text-4xl font-display tracking-wider text-primary">SPORTSTECHX</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{tab === 'login' ? 'Welcome back' : 'Create account'}</CardTitle>
              <CardDescription>
                {tab === 'login'
                  ? 'Sign in to your SportsTechX account'
                  : 'Join the sports technology intelligence platform'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Error / success messages */}
              {error && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {message && (
                <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                  {message}
                </div>
              )}

              <Tabs value={tab} onValueChange={v => { setTab(v as 'login' | 'signup'); setError(''); setMessage(''); }}>
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
                </TabsList>

                {/* ── Login tab ── */}
                <TabsContent value="login">
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

                  <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </Button>
                </TabsContent>

                {/* ── Signup tab ── */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-name" placeholder="Jane Smith" className="pl-9" value={fullName} onChange={e => setFullName(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-company">Company</Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-company" placeholder="Acme Corp" className="pl-9" value={company} onChange={e => setCompany(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-title">Job Title</Label>
                        <Input id="signup-title" placeholder="Analyst" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-country">Country</Label>
                      <select
                        id="signup-country"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-password" type="password" placeholder="Min. 8 characters" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-confirm" type="password" placeholder="Repeat password" className="pl-9" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    By creating an account you agree to our{' '}
                    <Link href="/terms-of-service" className="underline hover:text-foreground">Terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
