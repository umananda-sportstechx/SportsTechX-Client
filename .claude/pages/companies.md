# `/companies` + `/companies/[slug]`

**Files:**
- [app/(app)/companies/page.tsx](<../../app/(app)/companies/page.tsx>) — list with filter chips + search
- [app/(app)/companies/[slug]/page.tsx](<../../app/(app)/companies/[slug]/page.tsx>) — detail page

**Purpose:** Core IH browse surface. Paginated list with sector/sport/tech filters, search, sort. Detail page renders scores, fundraising history, sport/tech-tag chips.

## List page queries

| Key | Source | Notes |
|---|---|---|
| `qk.companies.list({ page, limit: 24, search, sector })` | `GET /api/companies` | main list — paginated |
| `qk.reference.sectors()` | `GET /api/sectors` | filter chips |

`useDebouncedValue(search, 300)` — search box debounced 300ms.

## Detail page queries

| Key | Source | Notes |
|---|---|---|
| `qk.companies.detail(slug)` | `GET /api/companies/<slug>` | core fields |
| `qk.deals.list({ company_id: company.id, limit: 30, sort: '-announced_date' })` | `GET /api/deals` | enabled once `company.id` resolves |

The deals fetch is a dependent query — enabled gate: `enabled: !!company?.id` (see [data-fetching.md](../data-fetching.md#conditional-fetch-skip-until-something-is-ready)).

## Mutations

None on these pages. Favoriting flows through the favorite-button component (which calls `apiRequest('POST', '/api/favorites/companies/<id>', { note })`).

## Feature gates

- Page renders to all tiers but BACKEND filters certain rich fields by tier (e.g. full funding details for free tier are abbreviated). The detail page should NOT add a frontend gate — trust the backend's response shape.

## URL params

```
?page=1&search=football&sector=fan_engagement
```

Two-way binding via `usePathname()` + `router.push(?, { scroll: false })`. The 300ms debounce only delays the SWR fetch, not the URL update (URL updates immediately for shareability).

## Related components

- `components/companies/filter-chips.tsx` — sector chips.
- `components/companies/company-card.tsx` — list-row card.
- `components/companies/company-detail/*` — score donut, funding timeline, sport/tech-tag chips.

## Gotchas

- The list endpoint returns enriched fields (`primary_sector`, `hq_city`, `total_funding_usd`) that the detail endpoint does NOT — see [server/api-test-findings-log.docx](../../../server/api-test-findings-log.docx) Bug #13. To render the detail page fully, currently doing the list+detail both is the workaround.
- `total_funding_usd_cached` (server side) returns as a STRING `"0"` while `total_funding_usd` returns as NUMBER. Bug #12. Be careful with arithmetic on the cached column.
- `companies/page.tsx` shows mock data when `companiesApi.length === 0` and not loading — guards against empty seed databases.
- URL `?sector=fan-engagement` (kebab) is accepted; sectors with underscores in their slug (`fan_engagement`) work too. Filter-chip click toggles the param.
