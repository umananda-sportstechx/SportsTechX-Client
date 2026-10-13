# Walk the Pitch (practice mode)

Lets a free (Explore) user see **Raise** or **Scout** in action before buying: a short guided tour over the real product UI with sample data, then the same workspace in view-only practice mode. No time limit; the tour can be replayed any time.

**Front end only.** Nothing changes on the server: the user stays on Explore there. Practice only changes what the browser shows and which requests it answers itself.

## Entry points

All are labelled "Walk the pitch →" (or "Walk the pitch first"). They are shown only to real Explore users (`getRealUserType() === 'explore'`) and never while practice is already running (`usePracticeAccess().canEnter`, `components/features/walkthrough/use-practice-access.ts`).

| Where | Component |
|---|---|
| Explore Home: a one-time chooser modal ("Raising capital" → Raise, "Investing" → Scout; seen-flag `stx:walkthrough:welcome-seen`) and a permanent card in "What needs your attention" that reopens it | `walkthrough-home-entry.tsx`, rendered by `components/explore/explore-home.tsx` |
| Explore sidebar upgrade cards: one link per product | `components/explore/upgrade-cards.tsx` |
| Locked-page upsell (`TierGate`): secondary "Walk the pitch first" for the page's product | `components/features/tier-gate/tier-gate.tsx` |
| Plans page, and the post-signup plan chooser (which first settles the account on Explore via `beforeStart`) | `WalkthroughButton` in `plans.tsx` / `paywall-gate.tsx` |

Every entry calls `enterPractice(product, source)` (`practice-actions.ts`): it resets the product's sample data, sets the tour's step 0 and does a full page load to Home.

## Phases (`store.ts`)

State lives in localStorage (`stx:sandbox:v2`): `{ active: 'raise' | 'scout' | null, phase: 'tour' | 'view', step }`.

| Call | Effect |
|---|---|
| `startWalkthrough(p)` | Fresh sample data for `p`; `active = p`, `phase = 'tour'`, `step = 0` |
| `setTourStep(n)` | Move the tour (`n === steps.length` is the finale) |
| `finishTour()` | `phase = 'view'`: stay in the workspace, view-only |
| `replayTour()` | Same as `startWalkthrough` for the active product |
| `exitPractice()` | Leave practice |
| `activeSandbox()` / `practicePhase()` | Plain reads for non-React code |
| `useSandbox()` / `usePractice()` | React view of the state |

Entering, replaying and leaving always do a full page load (`practice-actions.ts`), so tier readers and the SWR cache start clean.

While practice is on:
- **Tier switch.** `getUserType()` (`hooks/use-user-profile.ts`) returns the practice product instead of `explore`, so nav, page gates and features follow it. `getRealUserType()` still gives the real plan (Plans, Billing, the plan chooser and every entry point use it).
- **Practice bar** (`components/features/walkthrough/practice-bar.tsx`, above the navbar). Tour phase: "Walk the Pitch · X" + Exit. View phase: "Practice mode · view only" + Replay tour + Get Atlas X + Exit.
- **Coach** (`walkthrough-coach.tsx`, mounted by `AppShell` in the tour phase only).

## The tour engine

Tours are data: `lib/sandbox/tours/raise-tour.ts` and `scout-tour.ts` (types in `tour-types.ts`), picked by product in `components/features/walkthrough/tours.ts`.

1. **Intro** card (Start / Skip tour), then each **step**, then the **finale** (Get Atlas X → exits practice and opens Plans; Keep exploring (view-only) → `finishTour()`; Replay).
2. **Opening a step.** The coach navigates to `step.path` unless the current pathname already matches it. A path with `:params` (e.g. `/companies/:slug`) is never navigated to; the previous step's advance brings the user there.
3. **Spotlight.** The element `[data-tour="<target>"]` gets a ring and the rest of the page is faded (`use-tour-target.ts`). The coach waits up to 5s for it to render, scrolls it into view and follows it on scroll, resize and re-render. If it never appears, the step still shows, with a Next button.
4. **Advancing** (`use-tour-advance.ts`):
   - `next`: the Next button (or Enter).
   - `click`: a click (or change, for a select) on or inside the target.
   - `request`: the interceptor fires `stx:practice-request` (`events.ts`) with `{ method, path }` after every `/api/*` request; the step advances on a method + pattern match.
   - `path`: the pathname comes to match the pattern (after not matching, so stepping Back onto a matching page doesn't skip ahead).
5. **Controls.** Back (Escape), Skip tour (→ view phase), "Need a hand?" (email). Enter triggers Next on Next steps, never while typing or with another dialog open. Docked right on desktop, a bottom sheet at ≤1024px.
6. **Analytics** (`lib/analytics`, no-op without a Mixpanel token): `walkthrough:<product>:start`, `walkthrough:<product>:<stepId>:done`, `walkthrough:<product>:<stepId>:skip`, `walkthrough:<product>:finish` (with `choice`), `walkthrough:<product>:replay`.

### Adding or editing a step

1. Put `data-tour="<name>"` on the real element (lists: the first item only). Shared components forward a `data-tour` prop (`FeedCard`, `Seg`, `SaveToWatchlist`).
2. Add a `TourStep` to the product's tour: a stable `id` (analytics), the `path` it happens on, the `target`, a short `title`, a one or two sentence `body` (`{{Key}}` renders as a keyboard key) and an `advance`.
3. Make sure the sample data makes the step possible: an empty list has no first item to point at, and a `request` step needs a route in `raise-routes.ts`, `scout-routes.ts` or `core-routes.ts` that answers it.

## Requests (`interceptor.ts`)

`window.fetch` is wrapped (installed in `app/providers.tsx`). For the active product it tries these routes in order, and anything they don't answer goes to the real backend:
- `raise-routes.ts` or `scout-routes.ts`: the product's own data, as sample data. Writes are kept in this browser (`readSandboxData` / `writeSandboxData`).
- `core-routes.ts`: deck analysis, chat, exports, API keys, contacts, list caps, and company watchlists (`watchlist-routes.ts`).

In the **view** phase every non-GET `/api/*` request returns `gated()` ("Practice mode is view-only — get Atlas X to do this for real.") except `POST /api/deck-analysis/:id/stream` (a read-only stream) and `/api/auth/*` (sign-in bookkeeping). Add read-only POSTs to `VIEW_ALLOWED`.

## Gating (what practice locks)

| Feature | In practice |
|---|---|
| Deck analysis / Deck Screener | One sample deck with its full analysis; uploading, re-running and opening files → upgrade modal |
| AI chat | `SANDBOX_CHAT_LIMIT` (3) canned answers, then an upgrade message (view phase: locked) |
| Company contact details | Locked (`company_contacts` feature + empty contacts response) |
| Exports, API keys, webhooks, watchlist share links | Locked |
| Raise: strategy booking, Deal Flow opt-in | Locked |
| Scout: request intro, open deal documents, submit a shared deal | Locked |
| Investors list, Recently Funded | First `SANDBOX_LIST_CAP` (10) rows |
| Company watchlists | Two seeded sample lists ("Pitch-side shortlist", "Portfolio watch") of real companies; the user's real lists are never read or written |
| Pipeline, thesis, raise settings, shared-deal drafts, watchlists | Work during the tour, saved in this browser; read-only in the view phase |
| Public data (companies, analytics, roundup, events) | Real |

A locked action returns `gated()` (a 402 `TIER_REQUIRED`), which opens the app's normal upgrade modal with practice's own message.

## Changing it

- **Lock or unlock an action.** Add or remove a route in the right `*-routes.ts` file, returning `gated(product, 'message')`.
- **Different sample data.** Edit `raise-routes.ts`, `scout-routes.ts` or `watchlist-routes.ts`. Shapes must match the consuming components' types.
- **Reset in a browser.** Delete the localStorage keys starting `stx:sandbox:` (and `stx:walkthrough:welcome-seen` to see the Home chooser again).

## Pre-signup preview (`app/preview/`)

The same tour, same pages, same coach — reachable with **no session at all**, linked from the public landing page's "Walk the Pitch" CTAs. `/preview` is a product chooser; picking one calls the same `enterPractice()` as every other entry point, just landing on `/preview/<product>/home` instead of the real `/home`.

```
/preview                        → app/preview/page.tsx (chooser)
/preview/<product>/...          → app/preview/[product]/layout.tsx + page.tsx per route,
                                   mirroring app/(dashboard)/ one-for-one
```

Each `app/preview/[product]/<route>/page.tsx` is a thin wrapper: it imports the *same* component the real route renders (`RaiseHome`, `Recommended`, `DealDetail`, …) and, for the handful of pages that branch on the signed-in tier, reads the tier from the `[product]` URL segment instead of `getUserType(profile)` — there's no profile to read.

**`lib/preview-mode.ts`** is the one thing that makes this safe, and it's deliberately stateless: `previewBasePath()` derives `/preview/<product>` fresh from `window.location.pathname` on every call, rather than a flag set once and read later. An earlier version used a plain mutable variable and it went stale under Turbopack hot-reload (a file it depends on gets re-evaluated without the component that set the flag re-rendering) — don't reintroduce that shape.

Three things read it, and this is the whole safety boundary:
- `lib/sandbox/eligibility.ts` / `use-practice-access.ts` — `isPreviewMode()` substitutes for "real Explore account," since there is no account.
- `lib/sandbox/interceptor.ts` — in preview, a request this file doesn't answer locally **never** reaches the real backend (`backendFetch` returns an empty `json([])` instead of calling it). The in-app version *does* let a few GETs (investors, companies, sectors) pass through to the real backend as "public data" for a logged-in Explore user — that passthrough is exactly what breaks for an anonymous visitor, which is why `/api/investors/:id`, `/api/companies/:id` (+ `/news`, `/similar`) and `/api/signals` exist as real local routes now instead of relying on it. If a tour step 404s or shows empty data only in `/preview/*`, check here first: it's probably a public-data GET with no local route.
- `lib/routes.ts`'s `hrefOf()` / `pathOf()` / `companyHref()` — prefix every generated link so sidebar nav, "View company," breadcrumbs etc. stay inside `/preview/<product>/...` instead of bouncing an anonymous visitor to `/login`. `previewHref(path)` is the same idea for a path that arrives as a raw string from sandbox data rather than built from a route id (e.g. a home attention card's `cta_href`).

**The one sharp edge:** `lib/sandbox/tours/*.ts` build each `TourStep.path` at *module* scope (`const DECK = hrefOf('deck')`), and that module only ever first loads while already inside `/preview/<product>/*`. A preview-aware `hrefOf()` there would bake the prefix into the step permanently, and the coach's own navigation effect (which already adds the prefix at push time) would add it a second time — `/preview/raise/preview/raise/home`, a 404. That's why the tours import `canonicalHrefOf` (aliased to `hrefOf`) instead of the real one. If a tour step ever needs a *new* `hrefOf(...)` call, it must go through `canonicalHrefOf`, never the preview-aware one — `useTourAdvance`/`walkthrough-coach.tsx` already assume every `TourStep.path` is canonical and strip/re-add the prefix themselves.

**Adding a page to `/preview/*`:** add the matching `app/preview/[product]/<route>/page.tsx` the same way the existing ones are built — import the real component, branch on `useParams().product` instead of a profile if the real page does. If the page's data has no local sandbox route yet, add one (see "Changing it" above); don't assume a GET will quietly reach the real backend the way it does for a signed-in Explore user, because in preview it won't.
