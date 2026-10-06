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
import assert from 'node:assert/strict';
import { buildNav } from './nav.ts';
import { ROUTES, forTier } from './routes.ts';
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

const label = (i: { name: string; placeholder?: boolean }) => `${i.name}${i.placeholder ? '*' : ''}`;
const isSection = (e: unknown): e is { title: string; items: { name: string; placeholder?: boolean; path: string }[] } =>
	typeof e === 'object' && e !== null && 'items' in e;

let failures = 0;
const check = (ok: boolean, msg: string) => {
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
	if (!ok) failures++;
};

for (const tier of ['explore', 'raise', 'scout'] as Tier[]) {
	console.log(`\n[${tier}]`);
	const { nav, bottomNav } = buildNav(tier, false);
	const want = EXPECTED[tier];

	const top = nav.filter((e) => !isSection(e)).map((e) => label(e as { name: string }));
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
	const paths = [...nav.flatMap((e) => (isSection(e) ? e.items : [e as { path: string }])), ...bottomNav].map((i) => i.path);
	check(new Set(paths).size === paths.length, `${paths.length} unique paths`);

	// Nothing from the other paid product may appear.
	const leaked = ROUTES.filter((r) => r.tier && r.tier !== tier && paths.includes(forTier(r.path, tier) ?? '\0'));
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

// Admin sees every product's items; an explore user sees none of them.
const adminPaths = buildNav('raise', true).nav.length;
check(adminPaths > 0, 'admin builds a nav');
check(!JSON.stringify(buildNav('explore', false)).includes('pipeline'), 'explore sees no Raise-only route');
check(access('scout', 'raise', false) === 'hidden', 'raise user is not shown Scout routes');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
process.exit(failures === 0 ? 0 : 1);
