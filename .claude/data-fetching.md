# Data Fetching

Everything the client knows about reading or writing data. **Read this before adding any `useSWR` / `apiRequest` call.**

## The three pieces

1. **`qk`** ([lib/query-keys.ts](../lib/query-keys.ts)) — typed factory of cache keys. Every key returns a tuple `[path, params?, …]`.
2. **`fetcher`** ([lib/query-client.ts](../lib/query-client.ts)) — global SWR fetcher. Takes a tuple key, builds a URL via `buildUrl()`, attaches auth headers, handles 401-refresh-retry.
3. **`apiRequest`** ([lib/query-client.ts](../lib/query-client.ts)) — for non-GET (writes). Same auth + retry semantics, manual call site.

(Historical note: a compat-shim layer mirroring TanStack's `useQuery`/`useMutation`/`useQueryClient` lived here during the migration off `@tanstack/react-query`. It has been removed — all call sites are now native SWR. Don't add it back.)

## Reading data

```ts
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';

const { data, error, isLoading } = useSWR<Company[]>(
  qk.companies.list({ page, search, sector }),
  { dedupingInterval: 3 * 60_000 }, // optional per-call override
);
```

### Conditional fetch (skip until something is ready)

Pass `null` as the key:

```ts
useSWR(userId ? qk.profile() : null);
```

### Loading vs revalidation

`isLoading` is **true on first load only**. On subsequent revalidations SWR exposes `isValidating` instead. If a page needs a spinner during every refetch:

```ts
const { data, isLoading, isValidating } = useSWR(...);
const showSpinner = isLoading || (isValidating && !data); // typical safe choice
```

### Manual refetch

`mutate()` from the hook return triggers revalidation. Alias it locally if you like:

```ts
const { data, mutate: refetch } = useSWR(...);
// later:
void refetch();
```

## Writing data

Use `apiRequest` directly + `useSWRConfig().mutate(key)` for invalidation:

```ts
import { apiRequest } from '@/lib/query-client';
import { useSWRConfig } from 'swr';
import { qk } from '@/lib/query-keys';

const { mutate } = useSWRConfig();
const [saving, setSaving] = useState(false);

async function handleSave() {
  setSaving(true);
  try {
    await apiRequest('PATCH', '/api/profiles/me', { display_name: name });
    toast.success('Saved');
    void mutate(qk.profile());
  } catch (err) {
    toast.error((err as Error).message);
  } finally {
    setSaving(false);
  }
}
```

That's the whole pattern. Don't reach for a `useMutation`-style hook — the inline `useState + try/catch/finally` is shorter and more explicit at the call site.

## Invalidation

`useSWRConfig().mutate(key)` re-validates a single tuple key:

```ts
const { mutate } = useSWRConfig();
void mutate(qk.profile());                                       // single key
void mutate(qk.companies.list({ page: 1, limit: 24, search })); // exact match
```

For prefix-matching (invalidate every variant under a path), pass a key-matcher function:

```ts
void mutate((key) => Array.isArray(key) && key[0] === '/api/admin/claims');
```

From outside React (e.g. inside a `useEffect` cleanup or `auth-session-context`), use the global `mutate` re-exported from `swr`:

```ts
import { mutate as globalMutate } from 'swr';

void globalMutate(qk.profile());
void globalMutate(() => true, undefined, { revalidate: false }); // clear cache
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
