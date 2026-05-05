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
import { Search, Filter, X, Loader2, Building2, ChevronLeft, ChevronRight, ExternalLink, DollarSign, Calendar, MapPin } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface Deal {
  id: string; name: string; website?: string; custom_logo_url?: string;
  round_amount_usd?: number; funding_round_name?: string; announced_date?: string;
  hq_country?: string; hq_city?: string; primary_sector?: string; lead_investor?: string;
}

interface DealsResponse { data: Deal[]; total: number; page: number; limit: number; totalPages: number; }

function DealDetailPanel({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const domain = deal.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  return (
    <div className="w-80 xl:w-96 border-l bg-card flex flex-col h-full shrink-0 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold truncate">{deal.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {domain ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`} alt={deal.name} className="w-full h-full object-contain" />
              ) : <Building2 className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <h3 className="font-semibold">{deal.name}</h3>
              {deal.funding_round_name && <Badge variant="secondary" className="text-xs mt-1">{deal.funding_round_name}</Badge>}
            </div>
          </div>
          <Separator />
          <div className="space-y-2.5">
            {deal.round_amount_usd && deal.round_amount_usd > 0 && (
              <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-muted-foreground shrink-0" /><span className="font-semibold">{formatCurrency(deal.round_amount_usd)}</span></div>
            )}
            {deal.announced_date && (
              <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground shrink-0" /><span>{formatDate(deal.announced_date)}</span></div>
            )}
            {deal.hq_country && (
              <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span>{deal.hq_city ? `${deal.hq_city}, ` : ''}{deal.hq_country}</span></div>
            )}
            {deal.lead_investor && (
              <div className="text-sm"><span className="text-muted-foreground">Lead Investor:</span> {deal.lead_investor}</div>
            )}
          </div>
          {deal.website && (
            <a href={deal.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full"><ExternalLink className="h-3.5 w-3.5 mr-2" />Visit Website</Button>
            </a>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function FundingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [roundType, setRoundType] = useState(searchParams.get('round') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const [selectedId, setSelectedId] = useState(searchParams.get('deal') ?? '');

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
    if (roundType) sp.set('roundType', roundType);
    sp.set('page', String(page));
    sp.set('limit', '50');
    return `/api/deals?${sp.toString()}`;
  })();

  const { data, isLoading, isFetching } = useQuery<DealsResponse>({ queryKey: [apiUrl], staleTime: 3 * 60_000, refetchOnWindowFocus: false });

  const deals = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const selectedDeal = deals.find(d => d.id === selectedId) ?? null;

  const ROUND_TYPES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Bridge', 'Grant', 'Debt'];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg shrink-0">Funding Tracker</h1>
            {!isLoading && <span className="text-sm text-muted-foreground">{total.toLocaleString()} deals</span>}
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <div className="flex-1" />
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search deals..." className="pl-8 h-8" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); updateUrl({ q: e.target.value || null, page: null }); }} />
              {search && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSearch(''); updateUrl({ q: null }); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
            <Select value={roundType} onValueChange={v => { setRoundType(v); setPage(1); updateUrl({ round: v || null, page: null }); }}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Rounds" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Rounds</SelectItem>
                {ROUND_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <TableRow>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Round</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>)}</TableRow>
                ))
              ) : deals.length > 0 ? (
                deals.map(deal => {
                  const domain = deal.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
                  return (
                    <TableRow key={deal.id} className={cn('cursor-pointer', selectedId === deal.id && 'bg-primary/5 border-l-2 border-l-primary')}
                      onClick={() => { const next = deal.id === selectedId ? '' : deal.id; setSelectedId(next); updateUrl({ deal: next || null }); }}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
                            {domain ? <img src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`} alt={deal.name} className="w-full h-full object-contain" /> : <Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                          <p className="text-sm font-medium truncate max-w-[140px]">{deal.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{deal.funding_round_name && <Badge variant="secondary" className="text-xs">{deal.funding_round_name}</Badge>}</TableCell>
                      <TableCell className="text-sm font-medium">{deal.round_amount_usd && deal.round_amount_usd > 0 ? formatCurrency(deal.round_amount_usd) : 'Undisclosed'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{deal.announced_date ? formatDate(deal.announced_date) : '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{deal.hq_city && deal.hq_country ? `${deal.hq_city}, ${deal.hq_country}` : (deal.hq_country ?? '-')}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center py-16 text-muted-foreground">No deals found</TableCell></TableRow>
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
      {selectedDeal && <DealDetailPanel deal={selectedDeal} onClose={() => { setSelectedId(''); updateUrl({ deal: null }); }} />}
    </div>
  );
}
