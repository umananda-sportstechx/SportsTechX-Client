# Business Domain Glossary — client lens

Companion to [../../server/.claude/domain.md](../../server/.claude/domain.md). Same nouns, but mapped to where each one is **rendered** in this client.

## Core entities (5)

| Entity | Where it's rendered | Detail page |
|---|---|---|
| **Company** | `(app)/companies/` (list + filter chips), dashboard cards | `(app)/companies/[slug]/` |
| **Investor** | `(app)/investors/` | (detail page TBD) |
| **Deal** | `(app)/funding/` (funding tracker) | inline drawer in funding page |
| **Acquisition** | `(app)/ma/` (M&A tracker) | inline drawer |
| **Ecosystem entity** | `(app)/ecosystem/` + `(app)/events/` + `(app)/programs/` (filtered subset) | side panel |

## User-side nouns

| Noun | Source | Client touchpoints |
|---|---|---|
| Profile | `GET /api/me` → `useUserProfile()` in [hooks/use-user-profile.ts](../hooks/use-user-profile.ts) | shown in topbar, settings page |
| Tier (`user_type`) | `free / plus / pro` | used by [contexts/feature-access-context.tsx](../contexts/feature-access-context.tsx) to gate UI |
| Role (`user_role`) | `admin / user` | gates `(app)/admin/` route; `useIsAdmin()` |
| Plan | rows from `subscription_plans` | listed in `(app)/subscriptions/` |
| Trial | `is_trial` + `trial_ends_at` on profile | banner in topbar (when set) |
| Referral | submitted via post-login body | `?referral_code=` query param picked up by login flow |

## Engagement nouns

| Noun | Where it shows up |
|---|---|
| Favorite | "Saved" sidebar item; `(app)/saved-searches/` page lists by kind |
| Saved search | `(app)/saved-searches/` |
| Pinned list | rendered on `(app)/dashboard/` as a leaderboard widget |
| Alert / "you've been spotted" | not surfaced in v2 client yet — backend has the data |

## Trust & data-quality nouns

| Noun | Client touchpoints |
|---|---|
| Claim | `(app)/admin/` Claims tab; users submit via the company/investor detail "Claim this" CTA |
| Verified report | `(app)/reports/` mine list; clicking opens a SSE-fed view |
| DCR (Data Change Request) | `(app)/admin/` Data Change Requests tab |

## Monetisation nouns

| Noun | Client touchpoints |
|---|---|
| Credit | balance pill in topbar (AI vs integration); ledger view in `(app)/settings/` |
| Plan checkout | `(app)/subscriptions/` → POST `/api/billing/checkout` with `{ plan }` → Stripe |

## Search nouns

| Noun | Client touchpoints |
|---|---|
| Typeahead | Command palette (Cmd-K), `(app)` global header |
| Semantic search | gated to plus/pro; surfaces in the AI panel |

## AI / chat

| Noun | Client touchpoint |
|---|---|
| Conversation | `(app)/chat/[id]/` (SSE streamed) |
| AI panel | `components/shell/ai-panel.tsx` — a slide-over Ask-AI widget |

## Where to look when a noun isn't here

- Backend definitions: [../../server/.claude/domain.md](../../server/.claude/domain.md) — authoritative source for what each noun MEANS.
- Schema: [../../server/.claude/schema.md](../../server/.claude/schema.md) — the underlying DB tables.
- Postman: [../../server/docs/postman/sportstechx-api.postman_collection.json](../../server/docs/postman/sportstechx-api.postman_collection.json) — the wire shapes.
