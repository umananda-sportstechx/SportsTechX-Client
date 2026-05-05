'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Bookmark, Trash2, ExternalLink, Search } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { formatDate } from '@/lib/utils';

interface SavedSearch {
  id: string; name: string; query?: string; filters?: Record<string, unknown>;
  entity_type?: string; created_at: string; result_count?: number;
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SavedSearch[]>({
    queryKey: ['/api/saved-searches'],
    staleTime: 2 * 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/saved-searches/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast.success('Saved search deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const runSearch = (search: SavedSearch) => {
    const basePath = search.entity_type === 'investor' ? '/investors' : search.entity_type === 'deal' ? '/funding' : '/companies';
    const params = new URLSearchParams();
    if (search.query) params.set('q', search.query);
    if (search.filters) {
      Object.entries(search.filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    }
    router.push(`${basePath}?${params.toString()}`);
  };

  const searches = data ?? [];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Saved Searches</h1>
        <span className="text-sm text-muted-foreground">{searches.length} saved</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : searches.length > 0 ? (
        <div className="space-y-3">
          {searches.map(search => (
            <Card key={search.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bookmark className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-medium truncate">{search.name}</h3>
                      {search.entity_type && <Badge variant="secondary" className="text-xs shrink-0">{search.entity_type}</Badge>}
                    </div>
                    {search.query && <p className="text-sm text-muted-foreground truncate">Query: {search.query}</p>}
                    {search.result_count != null && <p className="text-xs text-muted-foreground mt-1">{search.result_count.toLocaleString()} results</p>}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(search.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => runSearch(search)}>
                      <Search className="h-3.5 w-3.5 mr-1.5" />Run
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(search.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bookmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No saved searches yet</p>
          <p className="text-sm text-muted-foreground mb-4">Save filters and searches from the database pages for quick access.</p>
          <Button variant="outline" onClick={() => router.push('/companies')}>Browse Companies</Button>
        </div>
      )}
    </div>
  );
}
