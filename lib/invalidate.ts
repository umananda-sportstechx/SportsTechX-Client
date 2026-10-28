import { mutate } from 'swr';
import { qk } from './query-keys';

/**
 * What to refresh after a write, in one place.
 *
 * The SWR config dedupes for 5 minutes and doesn't revalidate on focus, so a
 * cached read that a write doesn't explicitly refresh shows the old data on
 * every screen that has it — the "it only updates after a reload" bug. Each
 * helper here refreshes every key a kind of change can affect (lists, counts,
 * badges, home cards on other pages), so callers don't have to know them.
 *
 * Keys are `[path, params?]` arrays (lib/query-keys.ts), so a path prefix
 * matches every variant of a list (filters, pages, ids). A key that isn't
 * mounted is just marked stale and refetches on its next mount.
 */
export function refreshPaths(...prefixes: string[]): Promise<unknown> {
	return mutate((k: unknown) => Array.isArray(k) && typeof k[0] === 'string' && prefixes.some((p) => (k[0] as string).startsWith(p)));
}

/** Company watchlists: lists + counts, "in N watchlists" bookmarks, list pages,
 *  Signals' "my watchlists" filter, Scout home's watchlist card. */
export const refreshWatchlists = () => refreshPaths('/api/user-watchlists', '/api/signals', '/api/scout/home');

/** Raise investor pipeline: every board filter, activity logs, list counts, and
 *  the Raise home cards computed from the pipeline. */
export const refreshPipeline = () => refreshPaths('/api/raise/pipeline', '/api/user-watchlists', '/api/raise/home');

/** The raise itself (setup, criteria, status, deal-flow opt-in): workspace, home
 *  cards, market, deal-flow status, and investor matches built from it. */
export const refreshRaise = () => refreshPaths('/api/raise', '/api/recommendations/investors');

/** Scout profile / thesis / deals: home, recommendations, deal flow, can-submit,
 *  and Signals (thesis-scoped server-side). */
export const refreshScout = () => refreshPaths('/api/scout', '/api/signals');

/** Credits after a spend or a purchase: the balance everywhere it shows. (The
 *  ledger is an infinite list, which prefix mutates skip — it refetches on mount.) */
export const refreshCredits = () => mutate(qk.credits.balance());

/** A cancellation was just scheduled. The payment webhook writes the real
 *  `subscription_cancel_at` a moment later, so an immediate refetch still said
 *  "active" (and offered Cancel again): show it from the API's answer now, then
 *  re-read once the webhook has landed. */
export async function noteCancellation(accessUntil: string | null): Promise<void> {
	await mutate(qk.billing.subscription(), (d?: { subscription_cancel_at?: string | null; subscription_current_period_end?: string | null } | null) =>
		d && { ...d, subscription_cancel_at: accessUntil ?? d.subscription_current_period_end ?? new Date().toISOString() }, { revalidate: false });
	setTimeout(() => { void refreshPaths('/api/billing', '/api/profiles/me'); }, 6_000);
}

/** Who the user is and what they may do: profile/tier, feature gates, grants,
 *  claims (verify badge), notifications. After verification, billing changes, sign-in. */
export const refreshAccount = () => refreshPaths('/api/profiles/me', '/api/features', '/api/me/', '/api/claims', '/api/billing', '/api/credits', '/api/verified-reports');
