'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import {
  Shield, Users, CreditCard, BarChart3, Activity, CheckCircle, XCircle,
  Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, Eye, Check, X,
  DollarSign, TrendingUp, UserCheck, AlertTriangle, Building2, Globe,
} from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Claim {
  id: string; entity_type: string; entity_id: string; entity_name?: string;
  status: string; notes?: string; created_at: string;
  profile_id: string; claimant_email?: string; claimant_name?: string;
}

interface UserProfile {
  id: string; email?: string; display_name?: string; full_name?: string;
  user_type: string; company_name?: string; job_title?: string;
  created_at?: string; login_count?: number; stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

// Matches the AdminSalesController response — rows joined from
// billing_events × profiles. The columns are snake_case (canonical Postgres),
// not the Excel-style names this UI used to assume.
interface SalesRecord {
  id: string;
  profile_id: string;
  email: string | null;
  display_name: string | null;
  plan: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface PerformanceSummary {
  metric_type: string;
  total_requests: string;
  avg_duration_ms: string;
  p95_duration_ms: string;
  max_duration_ms: number;
  success_count: string;
  error_count: string;
}

interface TrialResult { email: string; success: boolean; subscriptionId?: string; error?: string; }
interface BulkTrialResponse { results: TrialResult[]; summary: { total: number; succeeded: number; failed: number }; }

// ─── Claims Tab ───────────────────────────────────────────────────────────────

function ClaimsTab() {
  const { mutate: globalMutate } = useSWRConfig();
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState<Claim | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewPending, setReviewPending] = useState(false);

  const { data, isLoading, mutate: refetch } = useSWR<{ data: Claim[]; total: number }>(
    ['/api/admin/claims', { status, limit: 50 }],
    { dedupingInterval: 30_000 },
  );

  const reviewClaim = async (args: { id: string; action: 'approve' | 'reject'; note: string }) => {
    // Backend has two distinct routes — there is no /:id/review aggregator.
    // approve → POST /:id/verify  (optionally send email),
    // reject  → POST /:id/reject  (note is informational; backend accepts it).
    const path = args.action === 'approve' ? 'verify' : 'reject';
    const body = args.action === 'approve' ? { send_email: true, note: args.note } : { note: args.note };
    setReviewPending(true);
    try {
      await apiRequest('POST', `/api/admin/claims/${args.id}/${path}`, body);
      toast.success(`Claim ${args.action === 'approve' ? 'verified' : 'rejected'} successfully`);
      setSelected(null);
      setReviewNote('');
      void globalMutate((key) => Array.isArray(key) && key[0] === '/api/admin/claims');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReviewPending(false);
    }
  };

  const claims = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} claims</span>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Claimant</TableHead>
              <TableHead className="text-xs">Entity</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs w-20">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : claims.length > 0 ? claims.map(claim => (
              <TableRow key={claim.id}>
                <TableCell className="text-sm">
                  <div>{claim.claimant_name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{claim.claimant_email}</div>
                </TableCell>
                <TableCell className="text-sm font-medium">{claim.entity_name ?? claim.entity_id}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{claim.entity_type}</Badge></TableCell>
                <TableCell>
                  <Badge variant={claim.status === 'approved' ? 'success' : claim.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                    {claim.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(claim.created_at)}</TableCell>
                <TableCell>
                  {claim.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => { setSelected(claim); setReviewNote(''); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No {status} claims
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Claim</DialogTitle>
            <DialogDescription>
              {selected?.claimant_name} is claiming {selected?.entity_type}: {selected?.entity_name ?? selected?.entity_id}
            </DialogDescription>
          </DialogHeader>
          {selected?.notes && (
            <div className="text-sm bg-muted/50 rounded p-3 text-muted-foreground">{selected.notes}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="review-note">Review Note (optional)</Label>
            <Textarea id="review-note" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Add a note for the claimant..." className="min-h-[80px]" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant="destructive" disabled={reviewPending}
              onClick={() => void reviewClaim({ id: selected!.id, action: 'reject', note: reviewNote })}>
              {reviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Reject
            </Button>
            <Button disabled={reviewPending}
              onClick={() => void reviewClaim({ id: selected!.id, action: 'approve', note: reviewNote })}>
              {reviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { mutate: globalMutate } = useSWRConfig();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [newType, setNewType] = useState('');
  const [updatePending, setUpdatePending] = useState(false);

  const usersKey: [string, Record<string, unknown>] = ['/api/admin/users', { page, limit: 20, ...(search ? { search } : {}) }];
  const { data, isLoading } = useSWR<{ data: UserProfile[]; total: number; totalPages: number }>(
    usersKey,
    { dedupingInterval: 30_000 },
  );

  const updateUserType = async (args: { id: string; user_type: string }) => {
    setUpdatePending(true);
    try {
      await apiRequest('PATCH', `/api/admin/users/${args.id}`, { user_type: args.user_type });
      toast.success('User type updated');
      setSelected(null);
      void globalMutate((key) => Array.isArray(key) && key[0] === '/api/admin/users');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdatePending(false);
    }
  };

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-8 h-8" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} users</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Company</TableHead>
              <TableHead className="text-xs">Plan</TableHead>
              <TableHead className="text-xs">Logins</TableHead>
              <TableHead className="text-xs">Joined</TableHead>
              <TableHead className="text-xs w-20">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium text-sm">{u.display_name ?? u.full_name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.company_name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={u.user_type === 'pro' ? 'default' : u.user_type === 'growth' ? 'secondary' : 'outline'} className="text-xs capitalize">
                    {u.user_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.login_count ?? 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.created_at ? formatDate(u.created_at) : '—'}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => { setSelected(u); setNewType(u.user_type); }}>
                    <UserCheck className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-muted-foreground mr-2">Page {page} of {data!.totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= data!.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>

          {/* Section 1: permanent tier change */}
          <div className="space-y-2 border-b pb-4">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Plan / role (permanent)</Label>
            <div className="flex gap-2">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['free', 'growth', 'pro', 'admin'].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={updatePending || newType === selected?.user_type}
                onClick={() => void updateUserType({ id: selected!.id, user_type: newType })}>
                {updatePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>

          {/* Section 2: time-bounded grant */}
          {selected && <GrantAccessSection profileId={selected.id} />}

          {/* Section 3: per-feature grants */}
          {selected && <FeatureGrantsSection profileId={selected.id} />}

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Time-bounded grant section ────────────────────────────────────────────────

function GrantAccessSection({ profileId }: { profileId: string }) {
  const [tier, setTier] = useState<'growth' | 'pro'>('pro');
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();

  const grant = async () => {
    setPending(true);
    try {
      await apiRequest('POST', '/api/admin/billing/grant-access', {
        profile_id: profileId,
        tier,
        days,
        reason: reason.trim() || undefined,
      });
      toast.success(`Granted ${tier} access for ${days} days`);
      setReason('');
      void globalMutate((key) => Array.isArray(key) && key[0] === '/api/admin/users');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2 border-b py-4">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Grant time-bounded access</Label>
      <div className="grid grid-cols-2 gap-2">
        <Select value={tier} onValueChange={(v) => setTier(v as 'growth' | 'pro')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" min={1} max={3650} value={days}
          onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 30))} />
      </div>
      <Input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
      <Button size="sm" disabled={pending} onClick={() => void grant()}>
        {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Grant {tier} for {days}d
      </Button>
    </div>
  );
}

// ─── Per-feature grants section ────────────────────────────────────────────────

interface GrantRow {
  id: string;
  feature_slug: string;
  expires_at: string | null;
  revoked_at: string | null;
  reason: string | null;
  created_at: string;
}

function FeatureGrantsSection({ profileId }: { profileId: string }) {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, isLoading } = useSWR<{ data: GrantRow[] }>(
    [`/api/admin/users/${profileId}/feature-grants`],
    { dedupingInterval: 30_000 },
  );
  const [slug, setSlug] = useState('csv_export');
  const [days, setDays] = useState<number | null>(30);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);

  const grants = data?.data ?? [];
  const activeGrants = grants.filter(g => !g.revoked_at && (!g.expires_at || new Date(g.expires_at) > new Date()));

  const submit = async () => {
    if (!slug.trim()) return;
    setPending(true);
    try {
      await apiRequest('POST', `/api/admin/users/${profileId}/feature-grants`, {
        feature_slug: slug.trim(),
        days: days ?? undefined,
        expires_at: days == null ? null : undefined,
        reason: reason.trim() || undefined,
      });
      toast.success(`Granted ${slug}`);
      setReason('');
      void globalMutate([`/api/admin/users/${profileId}/feature-grants`]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  const revoke = async (s: string) => {
    try {
      await apiRequest('DELETE', `/api/admin/users/${profileId}/feature-grants/${s}`);
      toast.success(`Revoked ${s}`);
      void globalMutate([`/api/admin/users/${profileId}/feature-grants`]);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Feature slugs from the in-app catalog — matches features.controller.ts on the server.
  const FEATURE_OPTIONS = [
    'reports_access', 'companies_full', 'deals_full', 'investors_full', 'acquisitions_full',
    'programs_access', 'events_access', 'framework_access', 'newsletter_access',
    'analytics_access', 'csv_export', 'api_access', 'ai_chat',
    'saved_searches', 'watchlists', 'recommendations',
  ];

  return (
    <div className="space-y-2 py-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Per-feature grants</Label>

      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : activeGrants.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active feature grants.</p>
      ) : (
        <div className="space-y-1">
          {activeGrants.map(g => (
            <div key={g.id} className="flex items-center gap-2 text-xs border rounded px-2 py-1">
              <span className="font-mono flex-1">{g.feature_slug}</span>
              <span className="text-muted-foreground">
                {g.expires_at ? `expires ${formatDate(g.expires_at)}` : 'permanent'}
              </span>
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => void revoke(g.feature_slug)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FEATURE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="number" min={0} placeholder="days (0 = permanent)" value={days ?? 0}
          onChange={e => {
            const v = parseInt(e.target.value);
            setDays(Number.isFinite(v) && v > 0 ? v : null);
          }} />
      </div>
      <Input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
      <Button size="sm" disabled={pending} onClick={() => void submit()}>
        {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Grant {slug} {days != null ? `for ${days}d` : '(permanent)'}
      </Button>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  { value: 'growth_yearly', label: 'Growth Yearly' },
  { value: 'pro_yearly', label: 'Pro Yearly' },
];

function BillingTab() {
  const [emailsText, setEmailsText] = useState('');
  const [planKey, setPlanKey] = useState('growth_yearly');
  const [trialDays, setTrialDays] = useState(30);
  const [results, setResults] = useState<BulkTrialResponse | null>(null);
  const [grantPending, setGrantPending] = useState(false);

  const emailCount = emailsText.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean).length;

  const handleGrant = async () => {
    const emails = emailsText.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setGrantPending(true);
    try {
      const res = await apiRequest('POST', '/api/admin/billing/bulk-grant-trial', { emails, planKey, trialDays });
      const data = (await res.json()) as BulkTrialResponse;
      setResults(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGrantPending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />Bulk Grant Trial Subscriptions
          </CardTitle>
          <CardDescription>Grant Stripe trial subscriptions to multiple users. Existing active subscriptions will be cancelled first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emails">User Emails</Label>
            <Textarea id="emails" placeholder="Paste emails, one per line or comma-separated..." className="min-h-[160px] font-mono text-sm"
              value={emailsText} onChange={e => setEmailsText(e.target.value)} />
            {emailCount > 0 && <p className="text-xs text-muted-foreground">{emailCount} email{emailCount !== 1 ? 's' : ''} detected</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={planKey} onValueChange={setPlanKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trial-days">Trial Days</Label>
              <Input id="trial-days" type="number" min={1} max={365} value={trialDays}
                onChange={e => setTrialDays(parseInt(e.target.value) || 30)} />
            </div>
          </div>

          <Button onClick={() => void handleGrant()} disabled={grantPending || emailCount === 0} className="w-full">
            {grantPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Granting...</>
              : <>Grant {trialDays}-day trial to {emailCount} user{emailCount !== 1 ? 's' : ''}</>}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-green-600 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />{results.summary.succeeded} succeeded
              </Badge>
              {results.summary.failed > 0 && (
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  <XCircle className="h-3 w-3 mr-1" />{results.summary.failed} failed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium">Email</th>
                    <th className="text-left px-3 py-2 text-xs font-medium">Status</th>
                    <th className="text-left px-3 py-2 text-xs font-medium">Subscription / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                      <td className="px-3 py-1.5 font-mono text-xs">{r.email}</td>
                      <td className="px-3 py-1.5">
                        {r.success
                          ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="h-3 w-3" />OK</span>
                          : <span className="flex items-center gap-1 text-destructive text-xs"><XCircle className="h-3 w-3" />Failed</span>}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{r.subscriptionId ?? r.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR<{ data: SalesRecord[]; total: number; totalPages: number }>(
    ['/api/admin/sales', { page, limit: 20, ...(search ? { search } : {}) }],
    { dedupingInterval: 60_000 },
  );

  const records = data?.data ?? [];
  // amount_cents is per-event in the smallest currency unit; sum to dollars/euros.
  const totalRevenue = records.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0) / 100;
  const displayCurrency = records.find(r => r.currency)?.currency?.toUpperCase() ?? 'USD';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email or name..." className="pl-8 h-8" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} records</span>
        {records.length > 0 && (
          <span className="text-sm font-medium ml-auto">{formatCurrency(totalRevenue)} {displayCurrency} on this page</span>
        )}
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Plan</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Stripe sub</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : records.length > 0 ? records.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                <TableCell className="text-sm">
                  <div>{r.display_name ?? '—'}</div>
                  {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                </TableCell>
                <TableCell><Badge variant="secondary" className="text-xs capitalize">{r.plan ?? '—'}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">{r.status ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{r.stripe_subscription_id ?? '—'}</TableCell>
                <TableCell className="text-sm font-medium text-right whitespace-nowrap">
                  {r.amount_cents != null ? `${formatCurrency(r.amount_cents / 100)} ${r.currency?.toUpperCase() ?? ''}`.trim() : '—'}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No records found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-muted-foreground mr-2">Page {page} of {data!.totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= data!.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────

function PerformanceTab() {
  const [timeRange, setTimeRange] = useState('24h');

  const { data, isLoading, mutate: refetch } = useSWR<{ summary: PerformanceSummary[]; slowest: unknown[] }>(
    ['/api/admin/performance', { range: timeRange }],
    { dedupingInterval: 60_000, refreshInterval: 5 * 60_000 },
  );

  const summary = data?.summary ?? [];

  const getHealth = (avg: number, type: string) => {
    const thresholds: Record<string, [number, number]> = {
      api_response: [200, 500], webhook: [300, 800], db_query: [50, 200], external_api: [500, 1500],
    };
    const [good, warn] = thresholds[type] ?? [200, 500];
    if (avg <= good) return 'good';
    if (avg <= warn) return 'warning';
    return 'critical';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last 1h</SelectItem>
            <SelectItem value="6h">Last 6h</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7d</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : summary.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map(s => {
            const avg = parseFloat(s.avg_duration_ms);
            const p95 = parseFloat(s.p95_duration_ms);
            const total = parseInt(s.total_requests);
            const errors = parseInt(s.error_count);
            const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0';
            const health = getHealth(avg, s.metric_type);
            return (
              <Card key={s.metric_type} className={health === 'critical' ? 'border-destructive/50' : health === 'warning' ? 'border-yellow-500/50' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize flex items-center gap-2">
                    {health === 'critical' ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : health === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /> : <Activity className="h-3.5 w-3.5 text-green-500" />}
                    {s.metric_type.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg</span>
                    <span className="font-medium">{avg.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">P95</span>
                    <span className="font-medium">{p95.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Requests</span>
                    <span className="font-medium">{total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Error rate</span>
                    <span className={`font-medium ${parseFloat(errorRate) > 5 ? 'text-destructive' : ''}`}>{errorRate}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No performance data for this time range</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const router = useRouter();

  if (!isAdminLoading && !isAdmin) {
    router.replace('/dashboard');
    return null;
  }

  if (isAdminLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage claims, users, billing, sales, and performance"
        actions={<Shield className="h-7 w-7 text-primary" />}
      />

      <Tabs defaultValue="claims">
        <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-full gap-1 flex-wrap mb-6">
          <TabsTrigger value="claims" className="rounded-full px-4 py-1.5 text-sm flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />Claims
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-full px-4 py-1.5 text-sm flex items-center gap-1.5">
            <Users className="h-4 w-4" />Users
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-full px-4 py-1.5 text-sm flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />Billing
          </TabsTrigger>
          <TabsTrigger value="sales" className="rounded-full px-4 py-1.5 text-sm flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />Sales
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-full px-4 py-1.5 text-sm flex items-center gap-1.5">
            <Activity className="h-4 w-4" />Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="claims"><ClaimsTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="billing"><BillingTab /></TabsContent>
        <TabsContent value="sales"><SalesTab /></TabsContent>
        <TabsContent value="performance"><PerformanceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
