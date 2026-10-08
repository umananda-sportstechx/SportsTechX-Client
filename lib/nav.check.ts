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
import { PRIVATE_PREFIXES } from './public-paths.ts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

/** `Section: a, b, c` — `*` marks a placeholder item. */
type Shape = { top: string[]; sections: [string, string[]][]; bottom: string[] };

const EXPECTED: Record<Tier, Shape> = {
	explore: {
		// Matches the Figma Side Nav (31:15195) and ATLAS Base.dc.html.
		// "Investors" is a Raise feature and is listed here on purpose: the
		// design shows it like any other item and lets the page sell. It is the
		// one nav entry in any product that resolves to `upsell` rather than
		// `allow`, which is why `buildNav` filters on `!== 'hidden'`.
		top: ['Home', 'Interests'],
		sections: [
			['Intelligence', ['Framework', 'Reports', 'Newsletter']],
			['Market', ['Analysis', 'Monthly Roundup', 'Companies', 'Events', 'Investors']],
		],
		bottom: ['Get verified'],
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
		bottom: ['Thesis Settings', 'Get verified', 'Subscription'],
	},
	scout: {
		top: ['Home'],
		sections: [
			['Discover', ['Companies', 'Recommended', 'Signals']],
			['Intelligence', ['Market', 'Monthly Roundup', 'Recently Funded']],
			['Watchlists', ['All watchlists']],
			['Deal Flow', ['All*', 'Featured*', 'Verified Raises*', 'From the Circle*', 'Deck Screener*']],
			['Resources', ['Framework', 'Reports', 'Events', 'Newsletter']],
		],
		bottom: ['Thesis Settings', 'Get verified', 'Subscription'],
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

	// Nothing from the other paid product may appear. `hidden`, not `!== allow`:
	// an `upsell` item is listed on purpose (Explore's Investors), and asking
	// through `access` means a route shared by both paid tiers is not counted as
	// a leak into either.
	const leaked = ROUTES.filter((r) => access(r.tier, tier, false) === 'hidden' && paths.includes(forTier(r.path, tier) ?? '\0'));
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

// The edge gate protects PRIVATE_PREFIXES; the real session check is
// <ProtectedRoute>. If a layout mounts ProtectedRoute but sits outside every
// listed prefix, the middleware stops gating it — the page renders, then
// ProtectedRoute bounces the user. Loud enough to notice, cheap enough to catch
// here instead. A comment cannot enforce this correspondence; this can.
{
	const all = readdirSync('app', { recursive: true, encoding: 'utf8' }).map((f) => String(f).replace(/\\/g, '/'));
	const layouts = all
		.filter((f) => f.endsWith('layout.tsx'))
		.filter((f) => readFileSync(`app/${f}`, 'utf8').includes('ProtectedRoute'));

	// A layout's own path is NOT its URL prefix: `(onboarding)/layout.tsx` sits
	// at a route-group root and contributes no segment, so it would read as `/`.
	// Derive from the pages it actually wraps instead.
	const urlOf = (f: string) =>
		'/' + f.replace(/\/(page|layout)\.tsx$/, '').split('/').filter((s) => s && !s.startsWith('(')).join('/');

	check(layouts.length > 0, `${layouts.length} ProtectedRoute layout(s) found`);

	// No retired URL may appear anywhere in source. This exists because the
	// manual sweep for it matched only '…' and "…" and missed three live
	// template literals (`/raise/investors/${id}`, `/scout/deal-flow/${id}`,
	// `/scout/discover/companies?q=`), each of which shipped as a dead link.
	// Covering all three quote styles is the whole point.
	//
	// Two generations of retired URL, both caught here: the per-tier trees
	// `/raise`, `/scout`, `/explore`, and the section groups
	// `/app/{discover,intelligence,resources}`.
	//
	// The server is scanned too, and it is the half that needs this most. The
	// client has `nav.check.ts`; the server has nothing, and its failures are
	// silent — `routeKey` ends `?? clean`, so an unmatched path returns itself,
	// misses STATIC_PAGES and the model quietly loses page awareness with no
	// error anywhere, while its system prompt carries markdown links the model
	// emits verbatim. Guarded by existsSync so a client-only checkout passes.
	{
		const RETIRED = /['"`](\/(raise|scout|explore)(\/|['"`])|\/app\/(discover|intelligence|resources)\/)/;
		const roots = ['app', 'components', 'lib', '../server/src'].filter((r) => existsSync(r));
		const src = roots
			.flatMap((r) => readdirSync(r, { recursive: true, encoding: 'utf8' }).map((f) => `${r}/${String(f)}`))
			.filter((f) => /\.tsx?$/.test(f));
		const stray: string[] = [];
		for (const f of src) {
			for (const line of readFileSync(f.replace(/\\/g, '/'), 'utf8').split('\n')) {
				// Skip comments — the retired paths are legitimately named in docs.
				if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
				// `/api/raise/...` is a real endpoint, not a retired page.
				if (RETIRED.test(line) && !/\/api\//.test(line)) {
					stray.push(`${f}: ${line.trim().slice(0, 70)}`);
				}
			}
		}
		check(stray.length === 0, `no retired URLs in source${stray.length ? `\n      ${stray.join('\n      ')}` : ` (${src.length} files across ${roots.length} roots)`}`);
	}
	for (const lay of layouts) {
		const dir = lay.replace(/layout\.tsx$/, '');
		const pages = all.filter((f) => f.startsWith(dir) && f.endsWith('page.tsx'));
		const uncovered = pages
			.map(urlOf)
			.filter((url) => !PRIVATE_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`)));
		check(uncovered.length === 0,
			`edge-gated: ${pages.length} page(s) under ${dir}${uncovered.length ? ` — MISSING ${uncovered.join(', ')}` : ''}`);
	}
}

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
// `exitCode` rather than `exit()`: on Windows, exiting while stdout still has
// buffered writes trips a libuv assertion, so the check crashes *after*
// printing PASS. Setting the code lets Node flush and exit on its own.
process.exitCode = failures === 0 ? 0 : 1;
