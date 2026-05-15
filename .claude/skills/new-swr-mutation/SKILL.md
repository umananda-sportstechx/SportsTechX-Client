---
name: new-swr-mutation
description: Send a write request (POST/PATCH/DELETE) through apiRequest and invalidate the appropriate SWR cache keys. Use whenever the user needs to modify data on the backend.
---

# Add a mutation

Two patterns. Pick based on whether you need loading/error UI state.

## Pattern A — fire-and-forget (preferred for simple cases)

```ts
import { apiRequest } from '@/lib/query-client';
import { useSWRConfig } from 'swr';
import { qk } from '@/lib/query-keys';
import { toast } from 'sonner';

function MyComponent() {
  const { mutate } = useSWRConfig();

  async function handleSave(body: SaveBody) {
    try {
      await apiRequest('PATCH', '/api/x/123', body);
      // Invalidate everything under /api/x — SWR refetches.
      await mutate((key) => Array.isArray(key) && key[0] === '/api/x');
      toast.success('Saved');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
}
```

## Pattern B — with loading state (preferred for buttons/forms)

Use the `useMutation` shim — same shape as TanStack's:

```ts
import { useMutation, useQueryClient, apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { toast } from 'sonner';

const qc = useQueryClient();
const m = useMutation({
  mutationFn: async (body: SaveBody) => {
    const res = await apiRequest('PATCH', '/api/x/123', body);
    return res.json();
  },
  onSuccess: (data) => {
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: qk.x.detail('123') });
    qc.invalidateQueries({ queryKey: ['/api/x'] }); // prefix match for lists
  },
  onError: (err) => toast.error(err.message),
});

// In JSX:
<Button disabled={m.isPending} onClick={() => m.mutate(body)}>
  {m.isPending ? 'Saving…' : 'Save'}
</Button>
```

`m.isPending` (alias `m.isLoading`) is true while the call is in flight. `m.error` exposes the thrown Error.

## Invalidation

The shim's `invalidateQueries({ queryKey })` does prefix-matching against `queryKey[0]`:

| Pass | Invalidates |
|---|---|
| `qk.profile()` (returns `['/api/profiles/me']`) | exactly that one entry |
| `['/api/x']` | every cached key starting with `/api/x` (lists with all param combos + the detail entry) |
| `qk.x.detail('123')` | exactly that one detail entry |

The "invalidate everything under /api/x" pattern is the right call after a write that affects both list and detail views.

## Auth + 401

`apiRequest` handles the 401-refresh-and-retry path. Don't add per-component retry logic.

## Optimistic updates (rare)

SWR's `mutate(key, optimisticData, { revalidate: false, populateCache: true })` writes ahead of the network. Use sparingly — the rollback path on failure is fiddly. Pattern:

```ts
const { mutate } = useSWRConfig();
await mutate(qk.x.detail(id), { ...currentData, name: nextName }, { revalidate: false });
try {
  await apiRequest('PATCH', `/api/x/${id}`, { name: nextName });
  await mutate(qk.x.detail(id));        // revalidate from server
} catch (err) {
  await mutate(qk.x.detail(id));        // rollback by revalidating
  throw err;
}
```

## Don'ts

- Don't `fetch()` directly for writes — lose 401 retry. Use `apiRequest`.
- Don't invalidate ALL queries (`mutate(() => true)`) unless you genuinely need to. Be targeted with prefix invalidation.
- Don't forget to invalidate the list view after creating/deleting an item — the user sees stale data otherwise.
- Don't catch 401/403 manually — central handler owns the redirect.

## See also

- [.claude/data-fetching.md](../../data-fetching.md) — the 401-retry contract in detail.
- [.claude/skills/new-form/SKILL.md](../new-form/SKILL.md) — when the mutation is wired to a form.
