'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search, Filter, X, Loader2, Building2, ChevronLeft, ChevronRight,
  ExternalLink, Globe, DollarSign, MapPin,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface Investor {
  id: string; name: string; description?: string; website?: string;
  type?: string; hq_country?: string; hq_city?: string;
  total_aum_usd?: number; sports_focus?: string[];
}

interface InvestorsResponse {
  data: Investor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function InvestorDetailPanel({ investor, onClose }: { investor: Investor; onClose: () => void }) {
  return (
    <div className="w-80 xl:w-96 border-l bg-card flex flex-col h-full shrink-0 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold truncate">{investor.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{investor.name}</h3>
              {investor.type && <Badge variant="secondary" className="text-xs mt-1">{investor.type}</Badge>}
            </div>
          </div>

          {investor.description && <p className="text-sm text-muted-foreground leading-relaxed">{investor.description}</p>}
          <Separator />

          <div className="space-y-2.5">
            {investor.hq_country && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{investor.hq_city ? `${investor.hq_city}, ` : ''}{investor.hq_country}</span>
              </div>
            )}
            {investor.total_aum_usd && investor.total_aum_usd > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>AUM: {formatCurrency(investor.total_aum_usd)}</span>
              </div>
            )}
          </div>

          {investor.website && (
            <a href={investor.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3.5 w-3.5 mr-2" />Visit Website
              </Button>
            </a>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function InvestorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const [limit] = useState(50);
  const [selectedId, setSelectedId] = useState(searchParams.get('item') ?? '');
  const [showFilters, setShowFilters] = useState(false);

  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v == null || v === '') sp.delete(k); else sp.set(k, String(v));
    });
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const apiUrl = (() => {
    const sp = new URLSearchParams();
    if (search) sp.set('search', search);
    if (type) sp.set('type', type);
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    return `/api/investors?${sp.toString()}`;
  })();

  const { data, isLoading, isFetching } = useQuery<InvestorsResponse>({
    queryKey: [apiUrl],
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: false,
  });

  const investors = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const selectedInvestor = investors.find(i => i.id === selectedId) ?? null;

  const INVESTOR_TYPES = ['VC', 'PE', 'Corporate VC', 'Family Office', 'Accelerator', 'Angel Network', 'Fund of Funds'];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg shrink-0">Investors</h1>
            {!isLoading && <span className="text-sm text-muted-foreground">{total.toLocaleString()} results</span>}
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <div className="flex-1" />
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search investors..." className="pl-8 h-8" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); updateUrl({ q: e.target.value || null, page: null }); }} />
              {search && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSearch(''); updateUrl({ q: null }); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
            <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(v => !v)} className="gap-2">
              <Filter className="h-4 w-4" />Filters
            </Button>
          </div>
          {showFilters && (
            <div className="mt-3 flex gap-2">
              <Select value={type} onValueChange={v => { setType(v); setPage(1); updateUrl({ type: v || null, page: null }); }}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {INVESTOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {(search || type) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setType(''); updateUrl({ q: null, type: null }); }} className="h-8 text-xs gap-1"><X className="h-3 w-3" />Clear</Button>}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <TableRow>
                <TableHead className="text-xs">Investor</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Type</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">HQ</TableHead>
                <TableHead className="text-xs hidden md:table-cell">AUM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>)}</TableRow>
                ))
              ) : investors.length > 0 ? (
                investors.map(inv => (
                  <TableRow
                    key={inv.id}
                    className={cn('cursor-pointer', selectedId === inv.id && 'bg-primary/5 border-l-2 border-l-primary')}
                    onClick={() => { const next = inv.id === selectedId ? '' : inv.id; setSelectedId(next); updateUrl({ item: next || null }); }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-muted rounded flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">{inv.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{inv.type && <Badge variant="secondary" className="text-xs">{inv.type}</Badge>}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{inv.hq_city && inv.hq_country ? `${inv.hq_city}, ${inv.hq_country}` : (inv.hq_country ?? '-')}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{inv.total_aum_usd && inv.total_aum_usd > 0 ? formatCurrency(inv.total_aum_usd) : '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center py-16 text-muted-foreground">No investors found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t px-4 py-2 flex items-center justify-end gap-1 bg-background shrink-0">
          <span className="text-xs text-muted-foreground mr-2">Page {page} of {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => { setPage(p => p - 1); updateUrl({ page: page - 1 }); }}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); updateUrl({ page: page + 1 }); }}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {selectedInvestor && <InvestorDetailPanel investor={selectedInvestor} onClose={() => { setSelectedId(''); updateUrl({ item: null }); }} />}
    </div>
  );
}
