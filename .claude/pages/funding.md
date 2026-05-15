# `/funding`

**File:** [app/(app)/funding/page.tsx](<../../app/(app)/funding/page.tsx>)
**Purpose:** Funding tracker — paginated deals list with year filters, KPI strip (YTD totals), drawer for deal detail.

## Queries

Three SWR calls (heavy page):

| Key | Source | Purpose |
|---|---|---|
| `qk.deals.list({ year: <YTD year>, limit: 200 })` | `GET /api/deals` | YTD aggregate for KPI strip |
| `qk.deals.list({ year_min: <YTD year - 2>, limit: 500 })` | `GET /api/deals` | trend chart (3-year window) |
| `qk.deals.list({ page, limit: 30, year: <YTD year> })` | `GET /api/deals` | paginated list |

Note: the third call is conceptually redundant with the first but limited to the visible page. The 200/500 limits are temporary — paginate or move to a dedicated aggregate endpoint when scale demands.

## Mutations

None. Drawer "save to favorites" goes through standard `apiRequest`.

## Feature gates

Page is plus+ (free tier sees a teaser version; client renders the same shell, backend returns abbreviated rows for free tier).

## Related components

- `components/funding/kpi-strip.tsx`
- `components/funding/deals-table.tsx`
- `components/funding/deal-detail-drawer.tsx`

## Gotchas

- Three parallel fetches on mount. Each ~700-900ms cold (EU latency). The KPI strip shows skeletons until the first call resolves.
- The "year_min" filter on the trend chart fetches up to 500 rows — careful when the dataset grows. Consider switching to a `/api/deals/stats` aggregate endpoint if it gets slow.
- "Mock data fallback when empty" pattern (same as dashboard) — see `useMock` guard.
- Drawer is purely client-side state (no route change). Closing the drawer doesn't pop history.
