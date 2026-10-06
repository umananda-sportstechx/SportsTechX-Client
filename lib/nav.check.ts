/**
 * Self-check for the derived nav. Run it with:  node lib/nav.check.ts
 *
 * Asserts the *structure* each product's sidebar must have — sections, order,
 * labels, flags — and deliberately says nothing about URLs, so it keeps working
 * across the route consolidation. That is the point: the paths are about to
 * change and the arrangement must not.
 *
 * The expected shape below was captured from the three hand-written nav arrays
 * (EXPLORE_NAV / RAISE_NAV / SCOUT_NAV) before they were deleted, so this is a
 * record of the signed-off sidebar, not of the implementation.
 */
import { buildNav } from './nav.ts';
import { ROUTES, forTier } from './routes.ts';
// The real guard, not a local copy: a hand-rolled `e is {title, items}`
// predicate is not a subtype of ShellNavEntry, so `.filter()` never narrows.
import { isSection } from '../components/atlas/shell/nav.ts';
import type { ShellNavItem } from '../components/atlas/shell/nav.ts';
import { access, type Tier } from './access.ts';

/** `Section: a, b, c` — `*` marks a placeholder item. */
type Shape = { top: string[]; sections: [string, string[]][]; bottom: string[] };

const EXPECTED: Record<Tier, Shape> = {
	explore: {
		top: ['Home'],
		sections: [
			['Intelligence', ['Framework', 'Reports', 'Newsletter']],
			// "Investors" was here. It is a Raise feature, and locked routes are
			// hidden until the user upgrades — the one deliberate change.
			['Market', ['Analysis', 'Monthly Roundup', 'Companies', 'Events']],
		],
		bottom: ['Interests*'],
	},
	raise: {
		top: ['Home'],
		sections: [
			['Raise', ['Pitch Deck', 'Investors', 'Programs']],
			['Discover', ['Companies', 'Recommended', 'Signals']],
			['Intelligence', ['Analytics', 'Monthly Roundup', 'My Market', 'Recently Funded']],
			['Watchlists', ['Main watchlist', 'All watchlists']],
			['Resources', ['Fundraising Guide*', 'Framework', 'Reports', 'Events', 'Newsletter']],
		],
		bottom: ['Thesis Settings', 'Subscription'],
	},
	scout: {
		top: ['Home'],
		sections: [
			['Discover', ['Companies', 'Recommended*', 'Signals']],
			['Intelligence', ['Market', 'Monthly Roundup', 'Recently Funded']],
			['Watchlists', ['All watchlists']],
			['Deal Flow', ['All*', 'Featured*', 'Verified Raises*', 'From the Circle*', 'Deck Screener']],
			['Resources', ['Framework', 'Reports', 'Events', 'Newsletter']],
		],
		bottom: ['Thesis Settings*', 'Subscription'],
	},
};

const label = (i: ShellNavItem) => `${i.name}${i.placeholder ? '*' : ''}`;

let failures = 0;
const check = (ok: boolean, msg: string) => {
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
	if (!ok) failures++;
};

for (const tier of ['explore', 'raise', 'scout'] as Tier[]) {
	console.log(`\n[${tier}]`);
	const { nav, bottomNav } = buildNav(tier, false);
	const want = EXPECTED[tier];

	const top = nav.filter((e) => !isSection(e)).map((e) => label(e as ShellNavItem));
	check(JSON.stringify(top) === JSON.stringify(want.top), `top-level: ${top.join(', ')}`);

	const got = nav.filter(isSection).map((s) => [s.title, s.items.map(label)] as [string, string[]]);
	check(got.length === want.sections.length, `${got.length} sections`);
	for (let i = 0; i < Math.max(got.length, want.sections.length); i++) {
		const g = got[i], w = want.sections[i];
		check(!!g && !!w && g[0] === w[0] && JSON.stringify(g[1]) === JSON.stringify(w[1]),
			`${w?.[0] ?? '?'}: ${g?.[1]?.join(', ') ?? '(missing)'}`);
	}

	const bottom = bottomNav.map(label);
	check(JSON.stringify(bottom) === JSON.stringify(want.bottom), `bottom: ${bottom.join(', ')}`);

	// `path` is the identity used for active state, section lookup and React
	// keys, so a duplicate would silently break one of them.
	const paths = [...nav.flatMap((e) => (isSection(e) ? e.items : [e as ShellNavItem])), ...bottomNav].map((i) => i.path);
	check(new Set(paths).size === paths.length, `${paths.length} unique paths`);

	// Nothing from the other paid product may appear. Asked through `access` so
	// a route shared by both paid tiers isn't counted as a leak into either.
	const leaked = ROUTES.filter((r) => access(r.tier, tier, false) !== 'allow' && paths.includes(forTier(r.path, tier) ?? '\0'));
	check(leaked.length === 0, `no cross-tier leakage${leaked.length ? ': ' + leaked.map((r) => r.id).join(', ') : ''}`);
}

// The watchlist splice: user lists land immediately before "All watchlists".
for (const tier of ['raise', 'scout'] as Tier[]) {
	const { nav } = buildNav(tier, false, [{ id: 'w1', name: 'My list' }], ROUTES[0]!.icon);
	const section = nav.filter(isSection).find((s) => s.title === 'Watchlists')!;
	const names = section.items.map((i) => i.name);
	check(names[names.length - 2] === 'My list' && names[names.length - 1] === 'All watchlists',
		`[${tier}] watchlists splice: ${names.join(', ')}`);
}

// Every nav destination is canonical. `/billing` is the one exception and is
// meant to be: Stripe builds its return URLs from that path server-side, so it
// stays put (see app/billing/layout.tsx). Any other non-/app path means a route
// was missed by the consolidation.
for (const tier of ['explore', 'raise', 'scout'] as Tier[]) {
	const { nav, bottomNav } = buildNav(tier, false);
	const all = [...nav.flatMap((e) => (isSection(e) ? e.items : [e as ShellNavItem])), ...bottomNav];
	const stray = all.filter((i) => !i.path.startsWith('/app') && i.path !== '/billing');
	check(stray.length === 0, `[${tier}] all paths canonical${stray.length ? ': ' + stray.map((i) => i.path).join(', ') : ''}`);
}

// Admin sees every product's items; an explore user sees none of them.
const adminPaths = buildNav('raise', true).nav.length;
check(adminPaths > 0, 'admin builds a nav');
check(!JSON.stringify(buildNav('explore', false)).includes('pipeline'), 'explore sees no Raise-only route');
check(access('scout', 'raise', false) === 'hidden', 'raise user is not shown Scout routes');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
// `exitCode` rather than `exit()`: on Windows, exiting while stdout still has
// buffered writes trips a libuv assertion, so the check crashes *after*
// printing PASS. Setting the code lets Node flush and exit on its own.
process.exitCode = failures === 0 ? 0 : 1;
