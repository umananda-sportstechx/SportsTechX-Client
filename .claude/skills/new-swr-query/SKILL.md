---
name: new-swr-query
description: Add a new read-only data fetch using SWR + the qk key factory. Use when a page needs to read data from the backend. Handles cache identity, auth, 401-refresh, conditional enable, and pagination.
---

# Add a new query

The fetcher is global. You just need to pick a key and call `useSWR`.

## Steps

1. **Define the key in `qk`** ([lib/query-keys.ts](../../../lib/query-keys.ts)) so it's typo-safe and reusable:

   ```ts
   export const qk = {
     // …existing…
     x: {
       list: (params: Record<string, unknown> = {}) => ['/api/x', params] as const,
       detail: (id: string) => ['/api/x', id] as const,
       byKind: (kind: 'a' | 'b', params: Record<string, unknown> = {}) =>
         ['/api/x', { kind, ...params }] as const,
     },
   };
   ```

   Convention: first element is the API path, second is a params object (becomes the URL query string). Path strings include `/api/` since the Next.js rewrite proxies that to the backend.

2. **Call `useSWR`** in your component:

   ```ts
   import useSWR from 'swr';
   import { qk } from '@/lib/query-keys';

   const { data, isLoading, error } = useSWR<XRow[]>(
     qk.x.list({ page: 1, search: q }),
     { dedupingInterval: 60_000 }, // optional per-call override
   );
   ```

   `data` is typed by your generic. `isLoading` is **true on first load only** — for "is something happening right now", combine with `isValidating`:

   ```ts
   const showSpinner = isLoading || (isValidating && !data);
   ```

3. **Conditional enable** — pass `null` instead of the key to skip the fetch:

   ```ts
   useSWR(userId ? qk.users.detail(userId) : null);
   useSWR(open && q.length >= 3 ? qk.search.typeahead(q) : null);
   ```

4. **Dependent queries** — when the second fetch needs data from the first:

   ```ts
   const { data: company } = useSWR<Company>(qk.companies.detail(slug));
   const { data: deals } = useSWR<Deal[]>(
     company?.id ? qk.deals.list({ company_id: company.id, limit: 30 }) : null,
   );
   ```

5. **Pagination** — the backend's envelope is `{ data, total, page, limit, offset, totalPages, nextCursor }`. Read accordingly:

   ```ts
   interface Page<T> { data: T[]; total: number; page: number; limit: number; totalPages: number; nextCursor: string | null }
   const { data } = useSWR<Page<X>>(qk.x.list({ page, limit: 24, search }));
   const rows = data?.data ?? [];
   const totalPages = data?.totalPages ?? 1;
   ```

## Backwards-compat (existing pages)

If you're editing a page that still uses the `useQuery` shim, you can keep that style — both go through the same SWR cache:

```ts
import { useQuery } from '@/lib/query-client';
const { data } = useQuery<XRow[]>({
  queryKey: qk.x.list(params),
  staleTime: 60_000,
  enabled: !!something,
});
```

But new code should prefer raw `useSWR` since the shim adds zero value.

## URL query params

`buildUrl()` (called by the global fetcher) serializes the params object:

- `null`, `undefined`, `''` → skipped.
- Arrays → repeated keys: `{ types: ['a', 'b'] }` → `types=a&types=b`.
- Nested objects → JSON-stringified.

Don't include `?` in the path. Pass clean param objects.

## Don'ts

- Don't pass a raw URL string: `useSWR('/api/x')` works but bypasses `qk` and won't dedup with other call sites that use the helper.
- Don't catch 401 / 403 per-component. The global fetcher owns redirect-to-login.
- Don't use `fetch()` directly for reads — you lose auth header + 401 retry. Use `useSWR` (or the `useQuery` shim).
- Don't add `refetchInterval` polling without a clear reason. SWR's dedup + on-demand revalidation is usually enough.

## See also

- [.claude/data-fetching.md](../../data-fetching.md) — the full picture.
- [.claude/skills/new-swr-mutation/SKILL.md](../new-swr-mutation/SKILL.md) — for writes.
