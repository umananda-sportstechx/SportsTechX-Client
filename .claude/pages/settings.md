# `/settings`

**File:** [app/(app)/settings/page.tsx](<../../app/(app)/settings/page.tsx>)
**Purpose:** User settings — profile editing, integrations linking, credits ledger view.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.profile()` (via `useUserProfile`) | `GET /api/me` | initial form values |
| `qk.credits.balance('ai')` | `GET /api/credits/balance?type=ai` | balance pill |
| `qk.credits.ledger('ai')` | `GET /api/credits/ledger?type=ai` | transaction history |

## Mutations

- **Profile patch:** `PATCH /api/me` with `{ display_name, job_title, company_name }`. Invalidates `qk.profile()` on success.

Form is react-hook-form + Zod. Defaults populated from `useUserProfile()`.

## Feature gates

None — every tier can edit their profile.

## Related components

- `components/settings/profile-form.tsx`
- `components/settings/credits-section.tsx`
- `components/settings/integrations-section.tsx` (Notion, Intercom support widget linking)

## Gotchas

- `PATCH /api/me` accepts the documented fields plus a few undocumented ones (see [server/api-test-findings-log.docx](../../../server/api-test-findings-log.docx)) — but the DTO is `.strict()` so DON'T send extras like `email` or `user_role` (server will 400).
- After save, `invalidateQueries({ queryKey: qk.profile() })` triggers a refetch. The form values stay in their edited state until the new data arrives — that's a UX choice, not a bug.
- Avatar upload is not wired yet (`avatar_url` is read-only).
- Credits balance + ledger refresh on tab switch into this page (default SWR mount behavior).
