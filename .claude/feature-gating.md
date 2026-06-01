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
| `growth` | `free` + everything marked `growth: true` | Mid-tier — most paid features |
| `pro` | `growth` + everything marked `pro: true` | Highest user tier |
| `admin` (role, not tier) | EVERYTHING — bypasses all gates | The check runs first in `checkAccess()` |

`UserType` is `'free' | 'growth' | 'pro'` (see [hooks/use-user-profile.ts](../hooks/use-user-profile.ts)). There's no "enterprise" tier in the client matrix yet (only the backend defines it for billing). All enterprise users effectively get `pro` access on the frontend.

## The matrix

DB-driven: the `features` + `feature_tier_access` tables, joined and served by [server/src/modules/features/features.controller.ts](../../server/src/modules/features/features.controller.ts) (cached 5 min). Admins edit the tier × feature matrix via `/admin/features` — **no redeploy needed**. On-wire row shape is unchanged from the old hardcoded array:

```ts
{ id, slug: 'reports_access', name: 'Reports library access', free: false, growth: true, pro: true }
```

The client fetches `/api/features` and rebuilds its in-memory `Map<slug, Feature>` lazily.

Seeding a brand-new slug into the tables (when the admin UI isn't enough — e.g. a code change that gates on a slug that doesn't exist yet) is a one-off script; see [server/scripts/seed-feature-slugs.js](../../server/scripts/seed-feature-slugs.js) — run it against **both** the local and Supabase databases.

### Slugs that gate sub-page surfaces (not whole pages)

- `advanced_filters` (growth+) — the advanced facets in the filter rail: Companies' Tech tags / City / Continent / Region, and Funding's Investor picker. See "Gated filter facets" below.
- `company_contacts` (pro) — the "Primary contact" reveal on the company drawer + detail page.

## Gated filter facets

[components/ui/filter-rail.tsx](../components/ui/filter-rail.tsx) facets accept an optional `gate?: string` (a feature slug). The rail calls `checkAccess(gate)` per facet:

- **entitled** (right tier / per-user grant / admin) → the real `multi`/`range`/`bool` control renders and works like any ungated facet;
- **not entitled** → a lock teaser renders in its place with a working "Upgrade" link to `/subscriptions`, and the tier badge reflects the matrix-derived `requiredTier`.

Do NOT reintroduce a hardcoded "always locked" facet kind. If a facet has no backing data/endpoint yet, omit it rather than shipping a permanent lock — a lock that never opens regardless of tier is a bug, not an upsell.

## What to render when locked

The contract is: `useFeatureAccess(slug)` returns `{ hasAccess: false, isLocked: true, requiredTier: '<minimum tier needed>' }`. Standard treatment in pages:

```tsx
const access = useFeatureAccess('csv_export');
if (access.isLoading) return <Skeleton />;
if (access.isLocked) {
  return (
    <UpgradeCard
      title="Export to CSV"
      tier={access.requiredTier}              // 'growth' or 'pro'
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
- [app/(app)/saved-searches/page.tsx](<../app/(app)/saved-searches/page.tsx>) — gates on `saved_searches` (growth+).
- [components/shell/ai-panel.tsx](../components/shell/ai-panel.tsx) — gates the AI chat surface on `ai_chat` (growth+).
- [components/ui/filter-rail.tsx](../components/ui/filter-rail.tsx) — per-facet `gate` on `advanced_filters` (Companies + Funding rails).
- [components/ui/company-drawer.tsx](../components/ui/company-drawer.tsx) + [app/(app)/companies/[slug]/page.tsx](<../app/(app)/companies/[slug]/page.tsx>) — Primary contact reveal on `company_contacts`.
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
