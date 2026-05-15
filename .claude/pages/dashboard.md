# `/dashboard`

**File:** [app/(app)/dashboard/page.tsx](<../../app/(app)/dashboard/page.tsx>)
**Purpose:** Landing page after sign-in. Aggregated overview widgets: latest deals, pinned-list leaderboards, ecosystem events, AI suggestions.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.deals.list({ limit: 20, sort: '-announced_date' })` | `GET /api/deals` | recent funding ticker |
| `qk.ecosystem.listByType('event', { limit: 3 })` | `GET /api/ecosystem-entities?entity_type=event` | upcoming events strip |
| `qk.recommendations()` | `GET /api/recommendations` | AI-curated entity suggestions |
| `qk.pinnedLists.list({ show_on_dashboard: 'true' })` | `GET /api/pinned-lists` | curated leaderboards |
| `qk.profile()` (via `useUserProfile`) | `GET /api/me` | tier badge, trial banner |

5 SWR calls fire in parallel on mount. All cached 5 min (default).

## Mutations

None — dashboard is read-only.

## Feature gates

None at page level (page is `free`). Individual widgets may gate themselves.

## Related components

- `components/dashboard/*` — widget cards (deals strip, leaderboard cards, suggestions panel).
- Charts via `recharts`.

## Gotchas

- Five parallel SWR calls on mount = five backend requests. Each takes ~700ms in EU (US-hosted backend). Total time-to-content ~1.5s. The widgets render independently as they arrive.
- If the user just signed up (`is_trial: false`, `user_type: 'free'`), the upgrade banner is shown via tier check, not via a feature gate.
- Dashboard mocks fall back when the API returns empty — see the `useMock` guards inside each widget. Useful for screenshots and demos.
