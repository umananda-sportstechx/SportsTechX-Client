# `/ma`

**File:** [app/(app)/ma/page.tsx](<../../app/(app)/ma/page.tsx>)
**Purpose:** M&A tracker — paginated acquisitions list with year filter and drawer detail.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.acquisitions.list({ limit: 1, sort: '-announced_date' })` | `GET /api/acquisitions` | most-recent acquisition (KPI bar headliner) |
| `qk.acquisitions.list({ year: <YTD>, limit: 100 })` | `GET /api/acquisitions` | YTD aggregate |
| `qk.acquisitions.list({ page, limit: 30 })` | `GET /api/acquisitions` | paginated list |

## Mutations

None.

## Feature gates

Page is plus+ (similar to funding — abbreviated for free tier server-side).

## Related components

- `components/ma/acquisition-row.tsx`
- `components/ma/acquisition-detail-drawer.tsx`

## Gotchas

- Same triple-fetch pattern as funding. Consider an aggregate endpoint when this gets heavier.
- Acquirer is polymorphic — could be a company OR an ecosystem entity. Row component handles both; check the `acquirer_type` field.
- Backend includes `acquirer_company_snapshot` / `acquiree_company_snapshot` JSONB blobs frozen at the time of the deal. Render those if the live company has since been renamed/deleted.
