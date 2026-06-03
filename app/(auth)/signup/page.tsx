'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { Loader2, Mail, Lock, User, Building } from 'lucide-react';

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

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  // After signup we always route into onboarding (skippable). A `redirectTo`
  // is preserved only as the post-onboarding destination via the query string.
  const redirectTo = params.get('redirectTo') ?? '/dashboard';

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

  const supabase = getSupabaseBrowser();

  const callPostLogin = async (token: string) => {
    try {
      await fetch('/api/auth/post-login', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch { /* non-blocking */ }
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
          // The custom auth-hook (server/src/modules/auth-hooks) treats this
          // origin's path as the post-verify `next`, so point it straight at
          // onboarding. New email-confirmed users land in the (skippable)
          // onboarding flow, same as the password/OAuth paths below.
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (err) { setError(err.message); return; }
      if (data.user && !data.session) {
        setMessage('Check your email for a confirmation link!');
      } else if (data.session) {
        await callPostLogin(data.session.access_token);
        // New accounts go through the (skippable) onboarding flow first.
        router.push('/onboarding');
      }
    } finally {
      setLoading(false);
    }
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

      {/* Right panel - signup form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <h1 className="text-4xl font-display tracking-wider text-primary">SPORTSTECHX</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create account</CardTitle>
              <CardDescription>Join the sports technology intelligence platform</CardDescription>
            </CardHeader>
            <CardContent>
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

              <OAuthButtons redirectTo={redirectTo} onError={setError} disabled={loading} />

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
              </p>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                By creating an account you agree to our{' '}
                <Link href="/terms-of-service" className="underline hover:text-foreground">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
