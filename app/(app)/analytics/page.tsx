'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, TrendingUp, DollarSign, Building2, Users, Activity, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import { useRouter } from 'next/navigation';

const COLORS = ['#ed1a52', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

interface AnalyticsOverview {
  total_companies: number;
  total_investors: number;
  total_deals: number;
  total_acquisitions: number;
  total_funding_usd: number;
}

interface FundingByYear {
  year: number;
  total_usd: number;
  deal_count: number;
}

interface FundingBySector {
  sector: string;
  total_usd: number;
  deal_count: number;
}

interface FundingByRound {
  round_type: string;
  total_usd: number;
  deal_count: number;
}

interface MaTrend {
  year: number;
  deal_count: number;
  total_usd: number;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  funding_by_year: FundingByYear[];
  funding_by_sector: FundingBySector[];
  funding_by_round: FundingByRound[];
  ma_by_year: MaTrend[];
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const analyticsAccess = useFeatureAccess('analytics_access');
  const [sport, setSport] = useState('all');

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics', sport],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sport !== 'all') params.set('sport', sport);
      const res = await fetch(`/api/analytics?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load analytics');
      return res.json();
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: sports } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/sports'],
    staleTime: 30 * 60_000,
  });

  if (!analyticsAccess.isLoading && analyticsAccess.isLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 text-center px-4">
        <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Analytics — {analyticsAccess.requiredTier ?? 'Plus'} feature</h2>
        <p className="text-muted-foreground mb-6">Upgrade your plan to access funding trends, sector breakdowns, and market insights.</p>
        <button className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          onClick={() => router.push('/subscriptions')}>
          Upgrade Plan
        </button>
      </div>
    );
  }

  const overview = data?.overview;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Sports tech market intelligence</p>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All sports" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {(sports ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <StatCard icon={Building2} label="Companies" value={formatNumber(overview?.total_companies ?? 0)} />
            <StatCard icon={Users} label="Investors" value={formatNumber(overview?.total_investors ?? 0)} />
            <StatCard icon={Activity} label="Funding Deals" value={formatNumber(overview?.total_deals ?? 0)} />
            <StatCard icon={DollarSign} label="Total Funding" value={formatCurrency(overview?.total_funding_usd ?? 0)} sub="All time" />
          </>
        )}
      </div>

      <Tabs defaultValue="funding">
        <TabsList>
          <TabsTrigger value="funding">Funding Trends</TabsTrigger>
          <TabsTrigger value="sector">By Sector</TabsTrigger>
          <TabsTrigger value="round">By Round</TabsTrigger>
          <TabsTrigger value="ma">M&A Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="funding" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funding Volume by Year</CardTitle>
              <CardDescription>Total funding raised and deal count per year</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full rounded" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.funding_by_year ?? []} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <defs>
                      <linearGradient id="fundingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ed1a52" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ed1a52" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} labelClassName="font-medium" />
                    <Area type="monotone" dataKey="total_usd" stroke="#ed1a52" fill="url(#fundingGradient)" strokeWidth={2} name="Total Funding" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sector" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funding by Sector</CardTitle>
              <CardDescription>Top sectors by total investment</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full rounded" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(data?.funding_by_sector ?? []).slice(0, 12)} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="sector" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="total_usd" name="Total Funding" radius={[4, 4, 0, 0]}>
                      {(data?.funding_by_sector ?? []).slice(0, 12).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="round" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funding by Round Type</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-64 w-full rounded" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data?.funding_by_round ?? []} cx="50%" cy="50%" outerRadius={90}
                        dataKey="total_usd" nameKey="round_type" label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {(data?.funding_by_round ?? []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Deals by Round</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-64 w-full rounded" /> : (
                  <div className="space-y-2">
                    {(data?.funding_by_round ?? []).slice(0, 8).map((r, i) => (
                      <div key={r.round_type} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm flex-1 truncate">{r.round_type}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">{r.deal_count} deals</Badge>
                        <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">{formatCurrency(r.total_usd, 'compact')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ma" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">M&A Activity by Year</CardTitle>
              <CardDescription>Number of acquisitions and disclosed deal value</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full rounded" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.ma_by_year ?? []} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="deal_count" name="Acquisitions" fill="#ed1a52" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="total_usd" name="Value (USD)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
