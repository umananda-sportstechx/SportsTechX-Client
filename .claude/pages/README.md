# Pages Index

One `.md` per top-level route. Each follows the same skeleton:

- **Path** — the URL.
- **File** — `app/(app)/<route>/page.tsx`.
- **Purpose** — one line.
- **Queries** — what `qk.*` keys it fetches.
- **Mutations** — what `apiRequest` / `useMutation` calls it makes.
- **Feature gates** — `useFeatureAccess(<slug>)` calls.
- **Related components** — non-page components specific to it.
- **Gotchas** — anything non-obvious.

## Authenticated routes — `(app)/`

| Route | Doc | Tier | Notes |
|---|---|---|---|
| `/dashboard` | [dashboard.md](dashboard.md) | free | landing post-login |
| `/companies`, `/companies/[slug]` | [companies.md](companies.md) | free (list), plus+ (detail-deep-fields) | core IH surface |
| `/investors` | [investors.md](investors.md) | plus+ | list only for now |
| `/funding` | [funding.md](funding.md) | plus+ | deals list |
| `/ma` | [ma.md](ma.md) | plus+ | acquisitions |
| `/ecosystem`, `/events`, `/programs` | [ecosystem.md](ecosystem.md) | free | shared backend |
| `/reports` | [reports.md](reports.md) | plus+ | published research |
| `/analytics` | (skipped — pro-only stub) | pro | dashboard metrics |
| `/admin` | [admin.md](admin.md) | role=admin | claims, users, sales, perf |
| `/settings` | [settings.md](settings.md) | free | profile + billing + integrations tabs |
| `/subscriptions` | [subscriptions.md](subscriptions.md) | free | Stripe checkout entry |
| `/api-keys` | [api-keys.md](api-keys.md) | pro | Developer API key mgmt |
| `/saved-searches` | (skipped — light surface) | plus+ | CRUD of user's saved searches |
| `/chat/[id]` | [chat.md](chat.md) | plus+ | SSE-streamed AI chat |
| `/integrations` | (skipped — short page) | varies | Notion, Attio, etc. linking |

## Unauthenticated routes — `(auth)/`

| Route | Doc |
|---|---|
| `/login`, `/forgot-password`, `/reset-password` | [login.md](login.md) |

## Public routes

- `/privacy-policy`, `/terms-of-service` — static markdown.
- `/auth/callback` — route handler only, no UI; see [../routing.md](../routing.md).

## Find by feature

| If you're touching… | Read |
|---|---|
| Anything that fetches data | [../data-fetching.md](../data-fetching.md) |
| Anything tier-gated | [../feature-gating.md](../feature-gating.md) |
| Anything redirect-on-auth | [../auth.md](../auth.md) |
| Adding a new route | [../skills/new-page/SKILL.md](../skills/new-page/SKILL.md) + [../routing.md](../routing.md) |
