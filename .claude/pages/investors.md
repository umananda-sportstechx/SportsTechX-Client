# `/investors`

**File:** [app/(app)/investors/page.tsx](<../../app/(app)/investors/page.tsx>)
**Purpose:** Paginated investor directory with category filter chips (VC, angel, corporate, accelerator, etc.) and search.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.investors.list({ page, limit: 24, search, category })` | `GET /api/investors` | main list |

## Mutations

None. Favoriting goes through the standard `apiRequest('POST', '/api/favorites/investors/<id>')`.

## Feature gates

Page is plus+ at the backend tier-data level (free users see a reduced row shape; client doesn't enforce extra gates).

## Related components

- `components/investors/category-chips.tsx`
- `components/investors/investor-row.tsx`

## Gotchas

- No detail page yet — clicking a row opens a side-panel drawer (similar to ecosystem). Detail page lives in the backlog.
- Investor `total_aum_usd` comes from the backend's `total_funding` field (renamed at the SQL layer) — be aware when reading the API directly that the field name differs from what the UI shows.
- Categories normalize on both client and server (kebab vs snake). Send what the backend expects: lowercase snake (`venture_capital`).
