# `/ecosystem` + `/events` + `/programs`

**Files:**
- [app/(app)/ecosystem/page.tsx](<../../app/(app)/ecosystem/page.tsx>) — full ecosystem entities list (filter by entity_type)
- [app/(app)/events/page.tsx](<../../app/(app)/events/page.tsx>) — entity_type='event' pre-filter
- [app/(app)/programs/page.tsx](<../../app/(app)/programs/page.tsx>) — entity_type='program' pre-filter

**Purpose:** Browse non-company entities (programs, events, funds, conferences). Three pages share one backend endpoint — different default filters.

## Queries

| Key | Source | Notes |
|---|---|---|
| Ecosystem page: raw URL via `[apiUrl]` querykey | `GET /api/ecosystem-entities` | filters via `q`, `entity_type`, page, limit |
| Events page: `qk.ecosystem.listByType('event', { page, limit: 24, sort: 'start_date' })` | same backend | pre-filtered |
| Programs page: `qk.ecosystem.listByType('program', { … })` | same backend | pre-filtered |

## Mutations

None.

## Feature gates

`programs_access` (free), `events_access` (free), full ecosystem listing is also free.

## Related components

- `EntityDetailPanel` (inline in ecosystem/page.tsx for now)
- `components/events/event-card.tsx`, `components/programs/program-card.tsx`

## Gotchas

- **Backend route is `/api/ecosystem-entities` NOT `/api/ecosystem`.** The ecosystem page used to send to `/api/ecosystem` and 404 silently — fixed in May 2026. If you see a 404, check the path.
- Param naming: backend expects `q` (not `search`) and `entity_type` (not `type`). Frontend's filter state uses `type` but emits `entity_type` to the API. The translation happens in the URL builder.
- Ecosystem page builds its own URL inline (`apiUrl`) instead of using `qk.*` — historic. Could migrate to `qk.ecosystem.list({ q, entity_type, page, limit })` to participate in the standard cache identity.
- Detail panel is in-page state (selectedId from URL `?item=<id>`), not a route. Sharing a link with `?item=` opens that entity's panel on load.
