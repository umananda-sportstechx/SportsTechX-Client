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
import { Search, X, Loader2, Building2, ChevronLeft, ChevronRight, ExternalLink, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface EcosystemEntity {
  id: string; name: string; description?: string; website?: string;
  type?: string; country?: string; city?: string; sports?: string[];
  is_verified?: boolean;
}

interface EcosystemResponse { data: EcosystemEntity[]; total: number; page: number; limit: number; totalPages: number; }

function EntityDetailPanel({ entity, onClose }: { entity: EcosystemEntity; onClose: () => void }) {
  return (
    <div className="w-80 xl:w-96 border-l bg-card flex flex-col h-full shrink-0 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold truncate">{entity.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center"><Globe className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <h3 className="font-semibold">{entity.name}</h3>
              {entity.type && <Badge variant="secondary" className="text-xs mt-1">{entity.type}</Badge>}
            </div>
          </div>
          {entity.description && <p className="text-sm text-muted-foreground leading-relaxed">{entity.description}</p>}
          <Separator />
          <div className="space-y-2.5">
            {entity.country && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span>{entity.city ? `${entity.city}, ` : ''}{entity.country}</span></div>}
          </div>
          {entity.website && (
            <a href={entity.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full"><ExternalLink className="h-3.5 w-3.5 mr-2" />Visit Website</Button>
            </a>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function EcosystemPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const [selectedId, setSelectedId] = useState(searchParams.get('item') ?? '');

  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v == null || v === '') sp.delete(k); else sp.set(k, String(v)); });
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const apiUrl = (() => {
    const sp = new URLSearchParams();
    if (debouncedSearch) sp.set('search', debouncedSearch);
    if (type) sp.set('type', type);
    sp.set('page', String(page)); sp.set('limit', '50');
    return `/api/ecosystem?${sp.toString()}`;
  })();

  const { data, isLoading, isFetching } = useQuery<EcosystemResponse>({ queryKey: [apiUrl], staleTime: 3 * 60_000, refetchOnWindowFocus: false });

  const entities = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const selected = entities.find(e => e.id === selectedId) ?? null;

  const ENTITY_TYPES = ['League', 'Federation', 'Team', 'Brand', 'Media', 'Agency', 'Association', 'Venue'];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg shrink-0">Ecosystem</h1>
            {!isLoading && <span className="text-sm text-muted-foreground">{total.toLocaleString()} entities</span>}
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <div className="flex-1" />
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search ecosystem..." className="pl-8 h-8" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); updateUrl({ q: e.target.value || null, page: null }); }} />
              {search && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSearch(''); updateUrl({ q: null }); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
            <Select value={type} onValueChange={v => { setType(v); setPage(1); updateUrl({ type: v || null, page: null }); }}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <TableRow>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Type</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 3 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>)}</TableRow>)
              ) : entities.length > 0 ? (
                entities.map(entity => (
                  <TableRow key={entity.id} className={cn('cursor-pointer', selectedId === entity.id && 'bg-primary/5 border-l-2 border-l-primary')}
                    onClick={() => { const next = entity.id === selectedId ? '' : entity.id; setSelectedId(next); updateUrl({ item: next || null }); }}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-muted rounded flex items-center justify-center shrink-0"><Globe className="h-3.5 w-3.5 text-muted-foreground" /></div>
                        <p className="text-sm font-medium">{entity.name}</p>
                        {entity.is_verified && <Badge variant="success" className="text-xs">Verified</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{entity.type && <Badge variant="secondary" className="text-xs">{entity.type}</Badge>}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{entity.city && entity.country ? `${entity.city}, ${entity.country}` : (entity.country ?? '-')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={3} className="text-center py-16 text-muted-foreground">No entities found</TableCell></TableRow>
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
      {selected && <EntityDetailPanel entity={selected} onClose={() => { setSelectedId(''); updateUrl({ item: null }); }} />}
    </div>
  );
}
