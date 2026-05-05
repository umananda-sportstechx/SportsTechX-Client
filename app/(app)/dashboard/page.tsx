'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, TrendingUp, Building2, DollarSign, FileText, Globe,
  ExternalLink, Calendar, Loader2,
} from 'lucide-react';
import Image from 'next/image';

type DashboardData = {
  startups?: { total?: number };
  dealflow?: Deal[];
  investors?: Investor[];
  report?: Report | null;
  totalDeals?: number;
  totalReports?: number;
  analytics?: Analytics;
};

type Deal = {
  id: string; name: string; website?: string; custom_logo_url?: string;
  round_amount_usd?: number; funding_round_name?: string; city?: string; country?: string;
};

type Investor = {
  id: string; name: string; fund_name?: string; website?: string; total_aum_usd?: number;
  type?: string; city?: string;
};

type Report = {
  id: string; title: string; description?: string; cover_url?: string;
  short_title?: string; pages?: number; summary_points?: string;
};

type Analytics = {
  fundingSummary10Y?: number; totalFundedCountries?: number; activeCompaniesCount?: number;
};

function CompanyLogo({ name, website }: { name: string; website?: string }) {
  const domain = website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  return (
    <div className="w-6 h-6 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
      {domain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
          alt={name}
          className="w-full h-full object-contain"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <Building2 className="w-3 h-3 text-muted-foreground" />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const { data: profile } = useUserProfile();

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const activeCompaniesCount = Number(dashboardData?.analytics?.activeCompaniesCount) || 0;
  const totalInvestment10Y = dashboardData?.analytics?.fundingSummary10Y || 0;
  const globalReach = dashboardData?.analytics?.totalFundedCountries || 0;
  const totalDeals = dashboardData?.totalDeals || 0;
  const totalReports = dashboardData?.totalReports || 0;
  const recentDealflow = Array.isArray(dashboardData?.dealflow) ? dashboardData.dealflow : [];
  const recentInvestors = Array.isArray(dashboardData?.investors) ? dashboardData.investors : [];
  const latestReport = dashboardData?.report ?? null;

  const displayName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'there';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Welcome */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-2">Welcome back, {displayName}!</h2>
          <p className="text-muted-foreground">
            Whether you are tracking investment opportunities, researching competitors, or spotting the next big trend - you are in the right place. Start exploring now, or dive into our latest industry insights.
          </p>
        </CardContent>
      </Card>

      {/* Snapshot */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Snapshot</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: Building2, value: activeCompaniesCount.toLocaleString(), label: 'Active Companies' },
                { icon: DollarSign, value: `$${Number(totalInvestment10Y).toFixed(1)}B`, label: 'Investment (10Y)' },
                { icon: TrendingUp, value: totalDeals.toLocaleString(), label: 'Deals Tracked' },
                { icon: FileText, value: totalReports.toLocaleString(), label: 'Reports Published' },
                { icon: Globe, value: globalReach.toLocaleString(), label: 'Countries Covered' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                  <Icon className="h-6 w-6 text-primary mb-2" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Report */}
      {latestReport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Latest Report</CardTitle>
            <CardDescription>Most recent market insights and analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {latestReport.cover_url && (
                <div className="relative shrink-0 mx-auto md:mx-0">
                  <div className="w-full max-w-xs md:w-72 aspect-[16/10] bg-card rounded-xl overflow-hidden shadow-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={latestReport.cover_url} alt={latestReport.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                    <Button
                      className="shadow-lg px-6"
                      onClick={() => router.push(`/reports/${latestReport.short_title ?? ''}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex-1 pt-0 md:pt-4">
                <h3 className="font-bold text-2xl mb-3">{latestReport.title}</h3>
                {latestReport.description && (
                  <p className="text-muted-foreground leading-relaxed mb-4">{latestReport.description}</p>
                )}
                {latestReport.summary_points && (
                  <div className="space-y-2">
                    {latestReport.summary_points.split(';').slice(0, 3).map((point, i) => {
                      const p = point.trim();
                      return p ? (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span className="text-sm text-muted-foreground">{p}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                {latestReport.pages && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground"><FileText className="inline h-4 w-4 mr-1" />{latestReport.pages} pages</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Dealflow + Latest Investors */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Recent Dealflow</CardTitle>
            <CardDescription>Latest funding rounds announced</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                ) : recentDealflow.length > 0 ? (
                  recentDealflow.slice(0, 8).map(deal => (
                    <TableRow key={deal.id} className="cursor-pointer" onClick={() => router.push(`/funding?deal=${deal.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CompanyLogo name={deal.name} website={deal.website} />
                          <span className="text-sm font-medium truncate max-w-[110px]">{deal.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{deal.round_amount_usd && deal.round_amount_usd > 0 ? `$${(deal.round_amount_usd / 1_000_000).toFixed(1)}M` : 'Undisclosed'}</div>
                        <div className="text-xs text-muted-foreground">{deal.funding_round_name ?? 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{deal.city}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No recent deals</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />Latest Investors</CardTitle>
            <CardDescription>Recently active investment funds</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Investor</TableHead>
                  <TableHead className="text-xs">AUM</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                ) : recentInvestors.length > 0 ? (
                  recentInvestors.slice(0, 8).map(inv => (
                    <TableRow key={inv.id} className="cursor-pointer" onClick={() => router.push(`/investors?item=${inv.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CompanyLogo name={inv.name} website={inv.website} />
                          <span className="text-sm font-medium truncate max-w-[110px]">{inv.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {inv.total_aum_usd ? `$${(inv.total_aum_usd / 1_000_000).toFixed(0)}M` : '-'}
                      </TableCell>
                      <TableCell>
                        {inv.type && <Badge variant="secondary" className="text-xs">{inv.type}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Explore</CardTitle>
          <CardDescription>Jump to the platform sections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Companies', path: '/companies', icon: Building2 },
              { label: 'Funding', path: '/funding', icon: DollarSign },
              { label: 'Investors', path: '/investors', icon: TrendingUp },
              { label: 'Reports', path: '/reports', icon: FileText },
            ].map(({ label, path, icon: Icon }) => (
              <Button key={path} variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push(path)}>
                <Icon className="h-5 w-5" />
                <span className="text-sm">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
