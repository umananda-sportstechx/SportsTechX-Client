# `/admin`

**File:** [app/(app)/admin/page.tsx](<../../app/(app)/admin/page.tsx>)
**Purpose:** Admin console. Five tabs: Claims, Users, Billing, Sales, Performance.

## Auth

Page-level gate: `useIsAdmin()` redirects to `/dashboard` if the user's `user_role !== 'admin'`. Server enforces the same via `@RequireRole('admin')` on every `/api/admin/*` endpoint.

## Queries per tab

| Tab | Key | Source |
|---|---|---|
| Claims | `['/api/admin/claims', status]` (custom — not in qk) | `GET /api/admin/claims?status=<status>&limit=50` |
| Users | `['/api/admin/users', search, page]` (custom) | `GET /api/admin/users?q=<search>&page=<n>&limit=20` |
| Sales | `['/api/admin/sales', search, page]` | `GET /api/admin/sales?...` |
| Performance | `['/api/admin/performance', range]` | `GET /api/admin/performance?range=<range>` |

Most use inline `queryFn` instead of the global fetcher because they build a manual URL with query params before the URL-builder existed. Should migrate to `qk.admin.*` for consistency.

## Mutations

- **Claims review:** maps `action: 'approve' | 'reject'` to two backend routes:
  - approve → `POST /api/admin/claims/<id>/verify` with `{ send_email: true, note }`
  - reject → `POST /api/admin/claims/<id>/reject` with `{ note }`
- **User update:** `PATCH /api/admin/users/<id>` with `{ user_type }` (tier or role shorthand).
- **Bulk grant trial:** `POST /api/admin/billing/bulk-grant-trial` with `{ emails, planKey, trialDays }` → returns per-email results.

## Feature gates

Page is admin-only. No tier checks inside (admins bypass all).

## Related components

Inline tab components: `ClaimsTab`, `UsersTab`, `BillingTab`, `SalesTab`, `PerformanceTab` — all in `admin/page.tsx`.

## Gotchas

- **Claim response shape (Bug #4 in api-test-findings):** the backend's admin claims endpoint enriches rows with `entity_type`, `entity_id`, `entity_name`, `claimant_email`, `claimant_name` — derived server-side. Don't try to re-derive in the client.
- **Sales response shape:** matches the backend's `SaleRow` (snake_case from `billing_events × profiles`). Earlier mock used Excel-style column names (`'Revenue Amount (Incl. VAT)'`); fixed May 2026.
- **Performance shape:** `{ summary: PerformanceSummary[], slowest: SlowestRow[], range }` — derived from `job_log` (HTTP request logs are TBD). `summary` rows have `metric_type` = queue name.
- **Bulk grant trial does NOT create a Stripe subscription** — it sets `is_trial = true` + bumps `trial_ends_at` + sets tier on the profile row. Real Stripe-side subscription creation is a follow-up.
- Many of these custom query keys bypass `qk.*` and use raw arrays. Consider migrating once the admin surface stabilises.
