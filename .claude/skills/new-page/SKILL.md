---
name: new-page
description: Scaffold a new protected route in the Next.js App Router. Use when adding any new page under (app)/* — a list view, a detail view, an admin tool. Wires the AppShell, gating, fetches, and URL params using the project's idioms.
---

# Scaffold a new page

Use [app/(app)/saved-searches/page.tsx](<../../../app/(app)/saved-searches/page.tsx>) as a clean template — it has list query, mutations, URL params, and is short enough to read end-to-end.

## Steps

1. **Decide the route.** New routes go under `app/(app)/<route>/page.tsx` (authenticated shell) or `app/(auth)/<route>/page.tsx` (pre-auth screens). Detail routes are nested: `app/(app)/<route>/[slug]/page.tsx`.

2. **Create the file.** Skeleton:

   ```tsx
   'use client';

   import { useState } from 'react';
   import { useRouter, useSearchParams } from 'next/navigation';
   import useSWR from 'swr';
   import { qk } from '@/lib/query-keys';
   import { useFeatureAccess } from '@/contexts/feature-access-context';
   import { Page, PageHeader } from '@/components/ui/page-header';
   import { Skeleton } from '@/components/ui/skeleton';

   interface XRow { id: string; name: string; /* … */ }
   interface XResponse { data: XRow[]; total: number; page: number; totalPages: number }

   export default function XPage() {
     const router = useRouter();
     const sp = useSearchParams();
     const [page, setPage] = useState(Number(sp.get('page') ?? '1'));

     // Tier gate (omit if the page is free).
     const access = useFeatureAccess('x_access');
     if (access.isLoading) return <PageSkeleton />;
     if (access.isLocked) return <UpgradePrompt requiredTier={access.requiredTier} />;

     // Data fetch.
     const { data, isLoading } = useSWR<XResponse>(qk.x.list({ page, limit: 24 }));

     // URL ↔ state binding for shareable links.
     const setPageAndUrl = (next: number) => {
       setPage(next);
       const params = new URLSearchParams(sp.toString());
       params.set('page', String(next));
       router.push(`?${params.toString()}`, { scroll: false });
     };

     return (
       <Page>
         <PageHeader title="X" subtitle="…" />
         {isLoading ? <Skeleton className="h-64" /> : <XList rows={data?.data ?? []} />}
         <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPageAndUrl} />
       </Page>
     );
   }
   ```

3. **Add the `qk.x.*` namespace** in [lib/query-keys.ts](../../../lib/query-keys.ts):

   ```ts
   export const qk = {
     // …existing…
     x: {
       list: (params: Record<string, unknown> = {}) => ['/api/x', params] as const,
       detail: (idOrSlug: string) => ['/api/x', idOrSlug] as const,
     },
   };
   ```

4. **Add a nav entry** in [components/shell/sidebar-rail.tsx](../../../components/shell/sidebar-rail.tsx) — pick a group, add an `{ id, name, path: '/x', icon, gate?: 'x_access' }`. The command palette consumes the same `NAV_GROUPS`.

5. **If the page is tier-gated:**
   - Add the feature slug to the server's matrix in [server/src/modules/features/features.controller.ts](../../../../server/src/modules/features/features.controller.ts). Free/Plus/Pro booleans.
   - The `useFeatureAccess(slug)` check in the page reads from `qk.features()` (already wired).

6. **If the page needs detail routing:**
   - Create `app/(app)/<route>/[slug]/page.tsx`.
   - Use `useParams<{ slug: string }>()` from `next/navigation`.
   - Fetch via `qk.x.detail(slug)`.

7. **Add a per-page doc** at [.claude/pages/<route>.md](../../pages/) — copy [.claude/pages/companies.md](../../pages/companies.md) as a template.

## Don'ts

- Don't omit `'use client'` — every page in this codebase is client-rendered.
- Don't fetch from a route handler (`route.ts`). Use the backend.
- Don't hardcode URLs — use `qk.x.list(params)`.
- Don't gate the page with `if (userType !== 'pro')` — use `useFeatureAccess('x_access')` so admins still see it.

## Reference pages

- Small, simple: [app/(app)/saved-searches/page.tsx](<../../../app/(app)/saved-searches/page.tsx>)
- List + filters + URL params: [app/(app)/companies/page.tsx](<../../../app/(app)/companies/page.tsx>)
- Detail page: [app/(app)/companies/[slug]/page.tsx](<../../../app/(app)/companies/[slug]/page.tsx>)
- Admin-gated multi-tab: [app/(app)/admin/page.tsx](<../../../app/(app)/admin/page.tsx>)

## See also

- [.claude/routing.md](../../routing.md)
- [.claude/data-fetching.md](../../data-fetching.md)
- [.claude/feature-gating.md](../../feature-gating.md)
