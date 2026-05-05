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
import { Search, X, Loader2, Building2, ChevronLeft, ChevronRight, ExternalLink, MapPin, Calendar } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface Program {
  id: string; name: string; description?: string; website?: string;
  type?: string; country?: string; city?: string; application_deadline?: string;
  cohort_size?: number; equity_taken?: number;
}

interface ProgramsResponse { data: Program[]; total: number; page: number; limit: number; totalPages: number; }

export default function ProgramsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const [selectedId, setSelectedId] = useState(searchParams.get('item') ?? '');

  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v == null || v === '') sp.delete(k); else sp.set(k, String(v)); });
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const apiUrl = `/api/ecosystem?type=program&${new URLSearchParams(Object.fromEntries(Object.entries({ search, page: String(page), limit: '50' }).filter(([, v]) => v))).toString()}`;

  const { data, isLoading, isFetching } = useQuery<ProgramsResponse>({ queryKey: [apiUrl], staleTime: 3 * 60_000, refetchOnWindowFocus: false });

  const programs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const selected = programs.find(p => p.id === selectedId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg shrink-0">Programs</h1>
            {!isLoading && <span className="text-sm text-muted-foreground">{total.toLocaleString()} programs</span>}
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <div className="flex-1" />
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search programs..." className="pl-8 h-8" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); updateUrl({ q: e.target.value || null, page: null }); }} />
              {search && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSearch(''); updateUrl({ q: null }); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <TableRow>
                <TableHead className="text-xs">Program</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Type</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Location</TableHead>
                <TableHead className="text-xs hidden xl:table-cell">Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>)}</TableRow>)
              ) : programs.length > 0 ? (
                programs.map(prog => (
                  <TableRow key={prog.id} className={cn('cursor-pointer', selectedId === prog.id && 'bg-primary/5 border-l-2 border-l-primary')}
                    onClick={() => { const next = prog.id === selectedId ? '' : prog.id; setSelectedId(next); updateUrl({ item: next || null }); }}>
                    <TableCell className="font-medium text-sm">{prog.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{prog.type && <Badge variant="secondary" className="text-xs">{prog.type}</Badge>}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{prog.city && prog.country ? `${prog.city}, ${prog.country}` : (prog.country ?? '-')}</TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{prog.application_deadline ? formatDate(prog.application_deadline) : '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center py-16 text-muted-foreground">No programs found</TableCell></TableRow>
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
      {selected && (
        <div className="w-80 xl:w-96 border-l bg-card flex flex-col h-full shrink-0 animate-slide-in-right">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold truncate">{selected.name}</h2>
            <Button variant="ghost" size="icon" onClick={() => { setSelectedId(''); updateUrl({ item: null }); }}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {selected.type && <Badge variant="secondary">{selected.type}</Badge>}
              {selected.description && <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>}
              <Separator />
              <div className="space-y-2.5">
                {selected.country && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{selected.city ? `${selected.city}, ` : ''}{selected.country}</span></div>}
                {selected.application_deadline && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Deadline: {formatDate(selected.application_deadline)}</span></div>}
              </div>
              {selected.website && <a href={selected.website} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full"><ExternalLink className="h-3.5 w-3.5 mr-2" />Website</Button></a>}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
