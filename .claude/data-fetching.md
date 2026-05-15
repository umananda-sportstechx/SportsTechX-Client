# Data Fetching

Everything the client knows about reading or writing data. **Read this before adding any `useSWR` / `useQuery` / `apiRequest` call.**

## The four pieces

1. **`qk`** ([lib/query-keys.ts](../lib/query-keys.ts)) — typed factory of cache keys. Every key returns a tuple `[path, params?, …]`.
2. **`fetcher`** ([lib/query-client.ts](../lib/query-client.ts)) — global SWR fetcher. Takes a tuple key, builds a URL via `buildUrl()`, attaches auth headers, handles 401-refresh-retry.
3. **`apiRequest`** ([lib/query-client.ts](../lib/query-client.ts)) — for non-GET (writes). Same auth + retry semantics, manual call site.
4. **TanStack-shaped shims** (`useQuery`, `useMutation`, `useQueryClient`) — backwards-compat layer in [lib/query-client.ts](../lib/query-client.ts). The 25 files that existed before the migration still use these. New code can pick either shim or raw SWR.

## Reading data

### Recommended (new code): raw SWR

```ts
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';

const { data, error, isLoading } = useSWR<Company[]>(
  qk.companies.list({ page, search, sector }),
  { dedupingInterval: 3 * 60_000 }, // optional per-call override
);
```

### Backwards-compat (existing pages): TanStack-shape

```ts
import { useQuery } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

const { data, isLoading } = useQuery<Company[]>({
  queryKey: qk.companies.list({ page, search, sector }),
  staleTime: 3 * 60_000,
  enabled: !!page,
});
```

Both go through the same fetcher. Pick raw SWR for new code; leave existing call sites alone.

### Conditional fetch (skip until something is ready)

```ts
// SWR-native: pass null instead of the key
useSWR(userId ? qk.profile() : null);

// Shim: enabled: false
useQuery({ queryKey: qk.profile(), enabled: !!userId });
```

### When the loading spinner flickers

`isLoading` is **true on first load only**. On subsequent revalidations SWR exposes `isValidating` instead. If a page used to render a spinner on every refetch under TanStack, port the check carefully:

```ts
const { data, isLoading, isValidating } = useSWR(...);
const showSpinner = isLoading || (isValidating && !data); // typical safe choice
```

## Writing data

### One-off mutation (preferred for new code)

```ts
import { apiRequest, useQueryClient } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

async function handleSave() {
  await apiRequest('PATCH', '/api/me', { display_name: name });
  qc.invalidateQueries({ queryKey: qk.profile() }); // re-fetch profile
}
```

### With loading state (TanStack shim — used by migrated pages)

```ts
import { useMutation, useQueryClient } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

const qc = useQueryClient();
const m = useMutation({
  mutationFn: async (body: { name: string }) => {
    const res = await apiRequest('PATCH', '/api/me', body);
    return res.json();
  },
  onSuccess: () => {
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: qk.profile() });
  },
  onError: (err) => toast.error(err.message),
});

// somewhere in the component:
m.mutate({ name });
```

`m.isPending` / `m.isLoading` is true during the call. After success, the returned data is on `m.data`; on error, `m.error`.

## Invalidation

Use prefix-matching from `useQueryClient`:

```ts
qc.invalidateQueries({ queryKey: qk.companies.list._def });  // doesn't exist — see below
qc.invalidateQueries({ queryKey: ['/api/companies'] });       // works: matches every key starting with this path
```

The shim's `invalidateQueries` compares `queryKey[0]` to each cached key's first element. Since every `qk.*.list()` returns `['/api/<path>', params]`, passing `['/api/<path>']` invalidates all variants.

For a single specific key, pass the full tuple:

```ts
qc.invalidateQueries({ queryKey: qk.profile() });  // ['/api/profiles/me'] — single entry
```

## The 401-refresh contract

This is the most important part of the file. It works automatically:

1. Any `fetch` via the global fetcher or `apiRequest` includes `Authorization: Bearer <jwt>`.
2. If the response is 401, the fetcher awaits `sessionRefreshLock.acquireAndRefresh()`. The lock guarantees ONE refresh per N concurrent 401s; other waiters get the new token.
3. Retry once with the refreshed token.
4. If retry also 401s: surfaces an error AND the response handler schedules `window.location.href = '/login?reason=session_expired'` after 1.5s.

Do not catch 401 / 403 per-component — the central handler owns the redirect path.

## URL params

`qk.*` keys are tuples like `['/api/companies', { page: 1, search: 'foo' }]`. `buildUrl()` serializes the second element into a query string:

- `null`, `undefined`, `''` → skipped (so callers can pass `q || undefined` safely).
- Array values → repeated keys: `{ types: ['a','b'] }` → `types=a&types=b`.
- Object values → JSON-stringified (used for nested filters).

Don't include the query string in the path yourself. Pass clean params; let `buildUrl` do the encoding.

## Pagination

Backend supports `page+limit` and `cursor` modes. Client uses page+limit everywhere:

```ts
const { data } = useSWR<Page<Company>>(qk.companies.list({ page, limit: 24, search }));
const total = data?.total ?? 0;
const totalPages = data?.totalPages ?? 1;
const items = data?.data ?? [];
```

Response envelope: `{ data, total, page, limit, offset, totalPages, nextCursor }`.

For cursor mode (rare; mostly for the developer API): pass `cursor` in the params object. Backend skips the COUNT — `total` will be `-1`. Render an "Load more" button on `nextCursor` instead of page numbers.

## Polling control

`disableQueryPolling()` and `enableQueryPolling()` in [lib/query-client.ts](../lib/query-client.ts) toggle a module-level `pollingDisabled` flag the fetcher reads. While disabled, every fetch returns `null` immediately. Used at hard-logout to stop in-flight requests before the auth cookie is cleared.

Don't call these from page code. Their call sites are intentional and limited to: `app-header.tsx`, `sidebar.tsx`, `auth-session-context.tsx`, `login/page.tsx`.

## Realtime / SSE

Not used from the client yet. Backend exposes `/api/events` (per-user SSE channel) and `/api/chat` (per-conversation SSE stream). When wiring an SSE consumer, use `EventSource` or `@microsoft/fetch-event-source` directly — SWR isn't suited to streams.
