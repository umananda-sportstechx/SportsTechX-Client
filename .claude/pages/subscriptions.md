# `/subscriptions`

**File:** [app/(app)/subscriptions/page.tsx](<../../app/(app)/subscriptions/page.tsx>)
**Purpose:** Plan selector + Stripe Checkout entry. Shows current plan, lists tiers (Free, Plus, Pro, Enterprise), CTA opens Stripe Checkout.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.billing.subscription()` | `GET /api/billing/subscription` | current plan |
| `qk.profile()` (via `useUserProfile`) | `GET /api/me` | fallback for tier label |

## Mutations

- **Checkout:** `POST /api/billing/checkout` with `{ plan: '<plan-slug>' }` (e.g. `growth-yearly`). Backend resolves the slug to a Stripe `price_id` via `subscription_plans.stripe_price_id`, returns `{ url, id }`. Client does `window.location.href = url` to redirect to Stripe Checkout.

The plan catalog itself is fetched from `GET /api/billing/plans` — slugs are not hardcoded; the page renders whatever `subscription_plans.is_active=true` rows the server returns.

## Feature gates

None on the page itself. Each tier card's CTA is gated by current tier:

```
plan.tier === 'free'          → button disabled (no checkout)
currentTier === plan.tier     → "Current plan"
otherwise                     → "Upgrade" → checkout
```

## Related components

- `components/subscriptions/plan-card.tsx`
- Trust strip at the bottom (logo array).

## Gotchas

- `POST /api/billing/checkout` accepts EITHER `{ plan: '<slug>' }` OR `{ price_id: 'price_...' }`. The web app uses `plan`; SDK consumers use `price_id`. Don't mix both.
- `success_url` / `cancel_url` are optional — backend defaults them to `APP_BASE_URL/billing/{success,cancel}`. Override only if you need a different landing.
- After successful Stripe Checkout, user lands on `/success` (separate page) which polls `qk.billing.subscription()` to detect plan upgrade. The Stripe webhook handler on the backend writes the subscription state out-of-band.
- Enterprise plan is a `mailto:` to `sales@sportstechx.com` — no automated provisioning yet.
