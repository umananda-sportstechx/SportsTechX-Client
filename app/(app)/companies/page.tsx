'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Filter, X, Loader2, Building2, ChevronLeft, ChevronRight,
  ExternalLink, Heart, Globe, DollarSign, Users, MapPin, ChevronDown,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useFeatureAccess } from '@/contexts/feature-access-context';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Company {
  id: string; name: string; description?: string; website?: string;
  custom_logo_url?: string; hq_country?: string; hq_city?: string;
  founded_year?: number; total_funding_usd?: number; employee_count?: string;
  last_funding_type?: string; last_funding_date?: string;
  primary_sector?: string; primary_sport?: string;
  is_verified?: boolean; verification_status?: string;
}

interface CompaniesResponse {
  data: Company[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CompanyLogo({ company }: { company: Company }) {
  const domain = company.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  if (company.custom_logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={company.custom_logo_url} alt={company.name} className="w-8 h-8 rounded object-contain" />
    );
  }
  if (domain) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
        alt={company.name}
        className="w-8 h-8 rounded object-contain"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return <Building2 className="h-5 w-5 text-muted-foreground" />;
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function CompanyDetailPanel({ company, onClose }: { company: Company; onClose: () => void }) {
  return (
    <div className="w-80 xl:w-96 border-l bg-card flex flex-col h-full shrink-0 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold truncate">{company.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Logo + name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              <CompanyLogo company={company} />
            </div>
            <div>
              <h3 className="font-semibold">{company.name}</h3>
              {company.primary_sector && <Badge variant="secondary" className="text-xs mt-1">{company.primary_sector}</Badge>}
            </div>
          </div>

          {/* Description */}
          {company.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{company.description}</p>
          )}

          <Separator />

          {/* Key details */}
          <div className="space-y-2.5">
            {company.hq_country && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{company.hq_city ? `${company.hq_city}, ` : ''}{company.hq_country}</span>
              </div>
            )}
            {company.founded_year && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Founded {company.founded_year}</span>
              </div>
            )}
            {company.total_funding_usd && company.total_funding_usd > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Total Funding: {formatCurrency(company.total_funding_usd)}</span>
              </div>
            )}
            {company.employee_count && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{company.employee_count} employees</span>
              </div>
            )}
            {company.primary_sport && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{company.primary_sport}</span>
              </div>
            )}
          </div>

          {/* Links */}
          {company.website && (
            <div className="pt-2">
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Visit Website
                </Button>
              </a>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZES = [20, 50, 100];

export default function CompaniesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthSession();

  // URL state
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [sector, setSector] = useState(searchParams.get('sector') ?? '');
  const [sport, setSport] = useState(searchParams.get('sport') ?? '');
  const [country, setCountry] = useState(searchParams.get('country') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const [limit, setLimit] = useState(Number(searchParams.get('limit') ?? '50'));
  const [selectedId, setSelectedId] = useState(searchParams.get('id') ?? '');
  const [showFilters, setShowFilters] = useState(false);

  // Keep URL in sync
  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v == null || v === '' || v === 0) sp.delete(k);
      else sp.set(k, String(v));
    });
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Build query string for API
  const apiUrl = (() => {
    const sp = new URLSearchParams();
    if (search) sp.set('search', search);
    if (sector) sp.set('sector', sector);
    if (sport) sp.set('sport', sport);
    if (country) sp.set('country', country);
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    return `/api/companies?${sp.toString()}`;
  })();

  const { data, isLoading, isFetching } = useQuery<CompaniesResponse>({
    queryKey: [apiUrl],
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Load reference data
  const { data: sectors } = useQuery<string[]>({ queryKey: ['/api/sectors'], staleTime: 60 * 60_000 });
  const { data: sports } = useQuery<{ name: string }[]>({ queryKey: ['/api/sports'], staleTime: 60 * 60_000 });

  const companies = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const selectedCompany = companies.find(c => c.id === selectedId) ?? null;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    updateUrl({ q: value || null, page: null });
  };

  const handleFilter = (key: string, value: string) => {
    if (key === 'sector') setSector(value);
    if (key === 'sport') setSport(value);
    if (key === 'country') setCountry(value);
    setPage(1);
    updateUrl({ [key]: value || null, page: null });
  };

  const handleClearFilters = () => {
    setSector(''); setSport(''); setCountry(''); setSearch(''); setPage(1);
    updateUrl({ sector: null, sport: null, country: null, q: null, page: null });
  };

  const hasFilters = !!(search || sector || sport || country);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg shrink-0">Companies</h1>
            {!isLoading && <span className="text-sm text-muted-foreground">{total.toLocaleString()} results</span>}
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                className="pl-8 h-8"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <Button
              variant={showFilters || hasFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(v => !v)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasFilters && <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{[sector, sport, country].filter(Boolean).length}</Badge>}
            </Button>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select value={sector} onValueChange={v => handleFilter('sector', v)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sectors</SelectItem>
                  {(sectors ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={sport} onValueChange={v => handleFilter('sport', v)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sports</SelectItem>
                  {(sports ?? []).map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 text-xs gap-1">
                  <X className="h-3 w-3" />Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <TableRow>
                <TableHead className="w-10 text-xs">#</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Sector</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Sport</TableHead>
                <TableHead className="text-xs hidden md:table-cell">HQ</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Funding</TableHead>
                <TableHead className="text-xs hidden xl:table-cell">Founded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : companies.length > 0 ? (
                companies.map((company, idx) => (
                  <TableRow
                    key={company.id}
                    className={cn('cursor-pointer', selectedId === company.id && 'bg-primary/5 border-l-2 border-l-primary')}
                    onClick={() => {
                      setSelectedId(company.id === selectedId ? '' : company.id);
                      updateUrl({ id: company.id === selectedId ? null : company.id });
                    }}
                  >
                    <TableCell className="text-xs text-muted-foreground">{(page - 1) * limit + idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
                          <CompanyLogo company={company} />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{company.name}</p>
                          {company.website && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{company.website.replace(/^https?:\/\//, '')}</p>}
                        </div>
                        {company.is_verified && <Badge variant="success" className="text-xs shrink-0">Verified</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {company.primary_sector && <Badge variant="secondary" className="text-xs">{company.primary_sector}</Badge>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{company.primary_sport ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{company.hq_city && company.hq_country ? `${company.hq_city}, ${company.hq_country}` : (company.hq_country ?? '-')}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{company.total_funding_usd && company.total_funding_usd > 0 ? formatCurrency(company.total_funding_usd) : '-'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{company.founded_year ?? '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No companies found</p>
                    {hasFilters && <Button variant="link" onClick={handleClearFilters} className="mt-2">Clear filters</Button>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-2 flex items-center justify-between bg-background shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={String(limit)} onValueChange={v => { setLimit(Number(v)); setPage(1); updateUrl({ limit: v, page: null }); }}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => { setPage(p => p - 1); updateUrl({ page: page - 1 }); }}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); updateUrl({ page: page + 1 }); }}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedCompany && (
        <CompanyDetailPanel company={selectedCompany} onClose={() => { setSelectedId(''); updateUrl({ id: null }); }} />
      )}
    </div>
  );
}
