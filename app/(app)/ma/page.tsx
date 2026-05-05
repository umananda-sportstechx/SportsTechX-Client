'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, X, Loader2, Building2, ChevronLeft, ChevronRight, ExternalLink, DollarSign, Calendar, Handshake } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface MADeal {
  id: string; target_name: string; acquirer_name?: string; deal_value_usd?: number;
  announced_date?: string; closed_date?: string; deal_type?: string; target_country?: string;
  target_sector?: string;
}

interface MADealsResponse { data: MADeal[]; total: number; page: number; limit: number; totalPages: number; }

function MADealDetailPanel({ deal, onClose }: { deal: MADeal; onClose: () => void }) {
  return (
    <div className="w-80 xl:w-96 border-l bg-card flex flex-col h-full shrink-0 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold truncate">{deal.target_name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              <Handshake className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{deal.target_name}</h3>
              {deal.deal_type && <Badge variant="secondary" className="text-xs mt-1">{deal.deal_type}</Badge>}
            </div>
          </div>
          <Separator />
          <div className="space-y-2.5">
            {deal.acquirer_name && <div className="text-sm"><span className="text-muted-foreground">Acquirer:</span> <span className="font-medium">{deal.acquirer_name}</span></div>}
            {deal.deal_value_usd && deal.deal_value_usd > 0 && (
              <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-muted-foreground shrink-0" /><span className="font-semibold">{formatCurrency(deal.deal_value_usd)}</span></div>
            )}
            {deal.announced_date && (
              <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground shrink-0" /><span>Announced: {formatDate(deal.announced_date)}</span></div>
            )}
            {deal.target_country && <div className="text-sm text-muted-foreground">{deal.target_country}</div>}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function MAPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const [selectedId, setSelectedId] = useState(searchParams.get('deal') ?? '');

  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v == null || v === '') sp.delete(k); else sp.set(k, String(v));
    });
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const apiUrl = `/api/acquisitions?${new URLSearchParams(Object.fromEntries(Object.entries({ search, page: String(page), limit: '50' }).filter(([, v]) => v))).toString()}`;

  const { data, isLoading, isFetching } = useQuery<MADealsResponse>({ queryKey: [apiUrl], staleTime: 3 * 60_000, refetchOnWindowFocus: false });

  const deals = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const selectedDeal = deals.find(d => d.id === selectedId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg shrink-0">M&A Tracker</h1>
            {!isLoading && <span className="text-sm text-muted-foreground">{total.toLocaleString()} deals</span>}
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <div className="flex-1" />
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search M&A deals..." className="pl-8 h-8" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); updateUrl({ q: e.target.value || null, page: null }); }} />
              {search && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSearch(''); updateUrl({ q: null }); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <TableRow>
                <TableHead className="text-xs">Target</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Acquirer</TableHead>
                <TableHead className="text-xs">Value</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>)}</TableRow>)
              ) : deals.length > 0 ? (
                deals.map(deal => (
                  <TableRow key={deal.id} className={cn('cursor-pointer', selectedId === deal.id && 'bg-primary/5 border-l-2 border-l-primary')}
                    onClick={() => { const next = deal.id === selectedId ? '' : deal.id; setSelectedId(next); updateUrl({ deal: next || null }); }}>
                    <TableCell className="font-medium text-sm">{deal.target_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{deal.acquirer_name ?? '-'}</TableCell>
                    <TableCell className="text-sm">{deal.deal_value_usd && deal.deal_value_usd > 0 ? formatCurrency(deal.deal_value_usd) : 'Undisclosed'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{deal.announced_date ? formatDate(deal.announced_date) : '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{deal.deal_type && <Badge variant="secondary" className="text-xs">{deal.deal_type}</Badge>}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center py-16 text-muted-foreground">No M&A deals found</TableCell></TableRow>
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
      {selectedDeal && <MADealDetailPanel deal={selectedDeal} onClose={() => { setSelectedId(''); updateUrl({ deal: null }); }} />}
    </div>
  );
}
