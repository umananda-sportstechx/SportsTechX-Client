---
name: new-swr-mutation
description: Send a write request (POST/PATCH/DELETE) through apiRequest and invalidate the appropriate SWR cache keys. Use whenever the user needs to modify data on the backend.
---

# Add a mutation

One canonical pattern: `useState + try/catch/finally + apiRequest + useSWRConfig().mutate(key)`. No `useMutation` hook — the compat shim is gone; do the state management inline.

## The pattern

```ts
import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { toast } from 'sonner';

function MyComponent() {
  const { mutate } = useSWRConfig();
  const [saving, setSaving] = useState(false);

  async function handleSave(body: SaveBody) {
    setSaving(true);
    try {
      const res = await apiRequest('PATCH', '/api/x/123', body);
      const data = await res.json();
      toast.success('Saved');
      void mutate(qk.x.detail('123'));         // invalidate the detail view
      void mutate((key) =>                     // prefix-invalidate list variants
        Array.isArray(key) && key[0] === '/api/x',
      );
      return data;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button disabled={saving} onClick={() => void handleSave(body)}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
  );
}
```

## Invalidation

`useSWRConfig().mutate` accepts either an exact key or a key-matcher function:

| Pass | Invalidates |
|---|---|
| `qk.profile()` (returns `['/api/profiles/me']`) | exactly that one entry |
| `qk.x.detail('123')` | exactly that one detail entry |
| `(key) => Array.isArray(key) && key[0] === '/api/x'` | every cached key starting with `/api/x` |

For "everything under this path" (after a write that affects both list + detail views), use the matcher function — that's the closest equivalent of TanStack's prefix-invalidate.

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
- Don't import `useMutation` / `useQueryClient` from `@/lib/query-client` — those shims are gone. Inline the state.
- Don't invalidate ALL queries (`mutate(() => true)`) unless you genuinely need to. Be targeted.
- Don't forget to invalidate the list view after creating/deleting an item — the user sees stale data otherwise.
- Don't catch 401/403 manually — central handler owns the redirect.

## See also

- [.claude/data-fetching.md](../../data-fetching.md) — the 401-retry contract in detail.
- [.claude/skills/new-form/SKILL.md](../new-form/SKILL.md) — when the mutation is wired to a form.
