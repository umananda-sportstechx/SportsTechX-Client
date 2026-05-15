# `/reports`

**File:** [app/(app)/reports/page.tsx](<../../app/(app)/reports/page.tsx>)
**Purpose:** Published research library. Reports are admin-curated with cover images, drive links, embedded polls.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.reports.list()` | `GET /api/reports` | all published reports |
| `qk.verifiedReports.mine()` | `GET /api/verified-reports/mine` | the user's AI-generated company reports (different concept) |

## Mutations

- Download tracking: `POST /api/reports/<slug>/downloads` (logged for analytics; does not gate download).
- Poll vote: `POST /api/reports/polls/<pollId>/vote` with `{ option_id }`.

## Feature gates

`reports_access` — plus+.

## Related components

- `components/reports/report-card.tsx`
- `components/reports/poll-widget.tsx`
- `components/reports/verified-report-row.tsx`

## Gotchas

- Two distinct concepts in one place: **Reports** are the editorial library (admin-curated); **Verified Reports** are per-user AI-generated company reports from approved claims. Don't conflate. The page renders them in separate sections.
- Reports versions are tier-gated server-side. The "Download" button calls `POST /downloads` which logs and then redirects to the report's `drive_link`. If the link is missing, surface an inline "coming soon".
- Polls: one vote per user per poll (enforced server-side); UI should disable the vote button after submission.
