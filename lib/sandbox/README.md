# Sandbox ("Try Sandbox For Free")

Lets a free (Explore) user try **Raise** or **Scout** for 7 days before buying: the real product UI, sample data where the product's own data would be, and paid actions locked.

**Front end only.** Nothing changes on the server — the user stays on Explore there. The sandbox only changes what the browser shows and which requests it answers itself.

## Flow

1. **Entry.** "Try Sandbox For Free" (`components/features/sandbox/try-sandbox-button.tsx`) appears on the Raise and Scout cards of:
   - the first-signup plan chooser (`components/paywall/paywall-gate.tsx`), which first closes the chooser on Explore;
   - the Plans page (`components/features/plans/plans.tsx`), for Explore users only.
2. **In the sandbox.**
   - **Tier switch.** `getUserType()` (`hooks/use-user-profile.ts`) returns the sandbox product instead of `explore`. The nav, page gates and features follow it.
   - **Real plan.** `getRealUserType()` still gives the real plan. Plans, Billing and the plan chooser use it.
   - **Banner.** `components/features/sandbox/sandbox-banner.tsx` sits above the navbar with the days left, Get Atlas X and Exit.
3. **First entry = new-customer setup.** A product's sandbox starts with no raise (Raise) or no thesis (Scout), answering exactly as the server does for a brand-new customer. On the first entry the banner opens the same setup wizard a paying customer gets after checkout (`openRaiseSetup()` / `openScoutThesis()`, once per product via `takeSetupPrompt`). It's skippable, and Home keeps the "finish setup" cards. What they enter is saved in the sandbox, and the sample workspace appears after setup, built around their answers.
4. **Requests.** `interceptor.ts` wraps `window.fetch` (installed in `app/providers.tsx`). For the active product it tries these routes in order, and anything they don't answer goes to the real backend:
   - `raise-routes.ts` or `scout-routes.ts`: the product's own data, as sample data. Writes are kept in this browser.
   - `core-routes.ts`: deck analysis, chat, exports, API keys, contacts, list caps.
5. **Exit / expiry.**
   - Exit and Get Atlas X turn the sandbox off with a full page load.
   - After 7 days from first entry (per product, `store.ts`), `activeSandbox()` returns null and the button reads "Sandbox ended".

## Gating (what the sandbox locks)

| Feature | In the sandbox |
|---|---|
| Deck analysis / Deck Screener | One sample deck with its full analysis; uploading, re-running and opening files → upgrade modal |
| AI chat | `SANDBOX_CHAT_LIMIT` (3) canned answers, then an upgrade message |
| Company contact details | Locked (`company_contacts` feature + empty contacts response) |
| Exports, API keys, webhooks | Locked |
| Raise: strategy booking, Deal Flow opt-in | Locked |
| Scout: request intro, open deal documents, submit a shared deal | Locked |
| Investors list, Recently Funded | First `SANDBOX_LIST_CAP` (10) rows |
| Pipeline, thesis, raise settings, shared-deal drafts | Work; saved in this browser |
| Public data (companies, analytics, roundup, events, watchlists) | Real |

A locked action returns `gated()` (a 402 `TIER_REQUIRED`), which opens the app's normal upgrade modal with the sandbox's message.

## Changing it

- **Lock or unlock an action.** Add or remove a route in the right `*-routes.ts` file, returning `gated(product, 'message')`.
- **Different sample data.** Edit `raise-routes.ts` or `scout-routes.ts`. Shapes must match the consuming components' types.
- **Reset in a browser.** Delete the localStorage keys starting `stx:sandbox:`.

Because it's browser-only, a determined user can reset the 7-day window. For a hard limit, the server would need to record sandbox use.
