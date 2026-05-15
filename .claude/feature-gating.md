# Feature Gating

How the client decides whether to render a feature, lock it behind a paywall, or hide it entirely. All routed through one provider.

## The provider

[contexts/feature-access-context.tsx](../contexts/feature-access-context.tsx) owns:

- Fetches `/api/features` (cached 30 min, no auto-revalidate — the matrix barely changes).
- Reads `useUserProfile()` to know the current tier.
- Reads `useIsAdmin()` to know whether to bypass everything.
- Exposes `checkAccess(slug) → { hasAccess, isLocked, requiredTier, userType, isLoading }`.

## The hook

```ts
import { useFeatureAccess } from '@/contexts/feature-access-context';

const { hasAccess, isLocked, requiredTier } = useFeatureAccess('analytics_access');

if (isLocked) return <UpgradePrompt requiredTier={requiredTier} />;
return <AnalyticsDashboard />;
```

`useFeatureAccess(slug)` re-renders whenever the user profile changes (e.g. after a tier upgrade roundtrip).

## Tier hierarchy

| Tier | What it unlocks | Notes |
|---|---|---|
| `free` | Public-feeling features marked `free: true` in the feature matrix | Default for new signups |
| `plus` | `free` + everything marked `plus: true` | Mid-tier — most paid features |
| `pro` | `plus` + everything marked `pro: true` | Highest user tier |
| `admin` (role, not tier) | EVERYTHING — bypasses all gates | The check runs first in `checkAccess()` |

There's no "enterprise" tier in the client matrix yet (only the backend defines it for billing). All enterprise users effectively get `pro` access on the frontend.

## The matrix

Lives server-side at [server/src/modules/features/features.controller.ts](../../server/src/modules/features/features.controller.ts) as a hardcoded array. Each row:

```ts
{ id: 1, slug: 'reports_access', name: 'Reports library access', free: false, plus: true, pro: true }
```

Currently 16 features. Adding one: edit the server file + redeploy. The client fetches `/api/features` and rebuilds its in-memory `Map<slug, Feature>` lazily.

## What to render when locked

The contract is: `useFeatureAccess(slug)` returns `{ hasAccess: false, isLocked: true, requiredTier: '<minimum tier needed>' }`. Standard treatment in pages:

```tsx
const access = useFeatureAccess('csv_export');
if (access.isLoading) return <Skeleton />;
if (access.isLocked) {
  return (
    <UpgradeCard
      title="Export to CSV"
      tier={access.requiredTier}              // 'plus' or 'pro'
      onUpgrade={() => router.push('/subscriptions')}
    />
  );
}
return <CsvExportButton />;
```

`UpgradeCard` isn't a real component yet — most pages inline a one-off lock state. As the pattern crystallises, lift to a shared component.

## Where it's used today

- [app/(app)/api-keys/page.tsx](<../app/(app)/api-keys/page.tsx>) — gates the entire page on `api_access` (pro-only).
- [app/(app)/analytics/page.tsx](<../app/(app)/analytics/page.tsx>) — gates on `analytics_access` (pro-only).
- [app/(app)/saved-searches/page.tsx](<../app/(app)/saved-searches/page.tsx>) — gates on `saved_searches` (plus+).
- [components/shell/ai-panel.tsx](../components/shell/ai-panel.tsx) — gates the AI chat surface on `ai_chat` (plus+).
- Various other inline checks — grep for `useFeatureAccess(`.

## Admin bypass

The very first check in `checkAccess()`:

```ts
if (isAdmin) return { hasAccess: true, isLocked: false, ... };
```

This is intentional and load-bearing — admins need to see and test every feature regardless of their `user_type`. Don't add tier checks BEFORE this; they'll be unreachable for admins.

## The `useFeatureAccessContext` escape hatch

For pages that need the raw `features` array (e.g. an admin page that lists "what each tier gets"):

```ts
import { useFeatureAccessContext } from '@/contexts/feature-access-context';

const { features } = useFeatureAccessContext();
```

Use sparingly. Most components should consume the derived `checkAccess` result via `useFeatureAccess(slug)`, not the raw matrix.

## Gotchas

- **`isLoading` is sticky on initial load.** Until both the profile AND the features list arrive, every `checkAccess` returns `isLocked: true, isLoading: true`. Render a skeleton, not the locked state.
- **Slug normalization.** The matrix supports both `snake_case` (`csv_export`) and `kebab-case` (`csv-export`) slugs — the Map stores both. Either works.
- **No caching of the access result.** `checkAccess` runs every render. If a list page calls it once per row for 200 rows × hot navigation, micro-optimise by memoizing.

## Don't do this

- Don't hardcode tier comparisons (`if (userType === 'pro')`). Use `useFeatureAccess(slug)` so the matrix stays the single source of truth.
- Don't render gated UI behind an `if (isAdmin)` check that's separate from `useFeatureAccess`. Admins already bypass; double-gating creates confusion when the matrix changes.
- Don't fetch `/api/features` from a page directly. Always go through the context.
