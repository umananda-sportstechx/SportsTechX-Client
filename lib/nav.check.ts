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
import { buildNav, navigable } from './nav.ts';
import { ROUTES, ROUTE_BY_ID, forTier } from './routes.ts';
import { FIGMA_ICON_NAMES } from '../components/atlas/icons/figma-icon-names.ts';
// The real guard, not a local copy: a hand-rolled `e is {title, items}`
// predicate is not a subtype of ShellNavEntry, so `.filter()` never narrows.
import { isSection } from '../components/atlas/shell/nav.ts';
import type { ShellNavItem } from '../components/atlas/shell/nav.ts';
import { access, type Tier } from './access.ts';
import { PRIVATE_PREFIXES, PUBLIC_PATHS } from './public-paths.ts';
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
		// Pitch Deck joined Explore when the deck analyser stopped being tier-gated:
		// credits pay for it, so the page has to be findable rather than sold.
		top: ['Home', 'Interests', 'Pitch Deck'],
		sections: [
			['Intelligence', ['Framework', 'Reports', 'Newsletter']],
			['Market', ['Analysis', 'Monthly Roundup', 'Companies', 'Events', 'Investors']],
		],
		bottom: [],
	},
	raise: {
		top: ['Home'],
		sections: [
			['Raise', ['Pitch Deck', 'Investors', 'Programs']],
			['Discover', ['Companies', 'Recommended', 'Signals']],
			['Intelligence', ['Analytics', 'Monthly Roundup', 'My Market', 'Recently Funded']],
			['Watchlists', ['Main watchlist', 'All watchlists']],
			['Resources', ['Framework', 'Reports', 'Events', 'Newsletter']],
		],
		bottom: [],
	},
	scout: {
		// "All watchlists" is heading-less: its "Watchlists" section holds a single
		// item until the user saves a list, and a one-item section collapses to a
		// plain top-level item (see buildNav). The splice test below covers the
		// section form, which reappears the moment a saved list joins it.
		top: ['Home', 'All watchlists'],
		sections: [
			['Discover', ['Companies', 'Recommended', 'Signals']],
			['Intelligence', ['Market', 'Monthly Roundup', 'Recently Funded']],
			['Deal Flow', ['All', 'Featured', 'Verified Raises', 'From the Circle', 'Deck Screener']],
			['Resources', ['Framework', 'Reports', 'Events', 'Newsletter']],
		],
		bottom: [],
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

// Every nav destination is flat — one segment under the root, no `/app`.
// This replaced the old "all paths start with /app" assertion when the prefix
// was dropped; it is the same guard pointing the other way.
for (const tier of ['explore', 'raise', 'scout'] as Tier[]) {
	const { nav, bottomNav } = buildNav(tier, false);
	const all = [...nav.flatMap((e) => (isSection(e) ? e.items : [e as ShellNavItem])), ...bottomNav];
	const stray = all.filter((i) => !i.path.startsWith('/') || i.path.startsWith('/app'));
	check(stray.length === 0, `[${tier}] all paths flat${stray.length ? ': ' + stray.map((i) => i.path).join(', ') : ''}`);
}

// The edge gate must cover every route in the manifest.
//
// `PRIVATE_PREFIXES` used to be the single entry `/app`, which covered the whole
// dashboard by construction. Now that each route sits at the root it has to be
// listed individually, and a route missing from that list is not an error — it
// is a private page that renders to anyone, silently. So assert both directions.
{
	const covered = (url: string) => PRIVATE_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`));
	const uncovered = ROUTES.map((r) => forTier(r.path, 'scout') ?? forTier(r.path, 'raise') ?? forTier(r.path, 'explore'))
		.filter((p): p is string => !!p)
		.filter((p) => !covered(p));
	check(uncovered.length === 0,
		`every route is edge-gated${uncovered.length ? ` — UNGATED: ${[...new Set(uncovered)].join(', ')}` : ` (${ROUTES.length} routes)`}`);

	// Nothing public may be caught by a private prefix. The private list went
	// from one entry to thirty-one, and a future route called `/w` or `/confirm`
	// would quietly put a login wall in front of a page that must stay reachable
	// without a session — the email-confirmation landing most of all, where the
	// visitor has no session *by definition*.
	const gatedPublic = PUBLIC_PATHS.filter((p) => covered(p));
	check(gatedPublic.length === 0,
		`no public path is edge-gated${gatedPublic.length ? `: ${gatedPublic.join(', ')}` : ` (${PUBLIC_PATHS.length} public paths)`}`);

	// And nothing stale: a prefix that matches no route and is not one of the two
	// non-ROUTES trees is a leftover that would gate a URL we no longer serve.
	const EXTRA = ['/onboarding', '/docs', '/verified-reports'];
	const allPaths = ROUTES.flatMap((r) => (['explore', 'raise', 'scout'] as Tier[]).map((t) => forTier(r.path, t)));
	const stalePrefixes = PRIVATE_PREFIXES
		.filter((p) => !EXTRA.includes(p))
		.filter((p) => !allPaths.some((path) => path === p || path?.startsWith(`${p}/`)));
	check(stalePrefixes.length === 0,
		`no stale edge prefixes${stalePrefixes.length ? `: ${stalePrefixes.join(', ')}` : ''}`);
}

// Every route's icon must exist in the generated Figma set. A typo here is
// silent — `FigmaIcon` renders null for an unknown name, so the item simply
// loses its glyph and nothing errors. The icons are generated from the Figma
// exports, so this also catches a route pointing at an icon that was renamed
// or never exported.
{
	const names = new Set<string>(FIGMA_ICON_NAMES);
	const missing = ROUTES.filter((r) => !names.has(r.icon)).map((r) => `${r.id} -> ${r.icon || '(none)'}`);
	check(missing.length === 0,
		`every route icon exists in the Figma set${missing.length ? ` — MISSING: ${missing.join(', ')}` : ` (${ROUTES.length} routes, ${names.size} icons)`}`);
	// The watchlist items the sidebar splices in at runtime use this one.
	check(names.has('nav-list'), 'the spliced watchlist icon exists');
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
		// `/app` is matched without requiring a quote before it: the two that
		// escaped the first sweep were a markdown link `(/app/pipeline)` in the
		// chat prompt and an interpolation `${base}/app/deal-flow/…` in an email.
		// `@/app/foo.css` import specifiers are excluded by the `@` lookbehind.
		//
		// `/setup` and `/onboarding/scout` joined the list when both setup
		// wizards became modals: there is no route behind either string any
		// more, so anything still emitting one — a server `cta_href`, an email,
		// an LLM prompt — is a dead link nobody would notice.
		const RETIRED = /['"`]\/(raise|scout|explore|setup)(\/|['"`])|['"`]\/onboarding\/(scout|explore)['"`]|(?<![\w@])\/app(\/|['"`])/;
		const roots = ['app', 'components', 'lib', '../server/src'].filter((r) => existsSync(r));
		// This file defines the retired patterns, so it necessarily contains them.
		const SELF = 'nav.check.ts';
		const src = roots
			.flatMap((r) => readdirSync(r, { recursive: true, encoding: 'utf8' }).map((f) => `${r}/${String(f)}`))
			.filter((f) => /\.tsx?$/.test(f) && !f.endsWith(SELF));
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

// ── navigable(): what an agent chip may offer ───────────────────────────────
// Stricter than the sidebar on purpose. This is the case that actually broke:
// every chip used to be built with `pathOf(id, 'raise')`, so a Scout could be
// handed an "Open Programs" button for a page only a founder can open.
{
	check(navigable('companies', 'scout') && navigable('companies', 'raise'),
		'navigable: a shared page is offered to both products');
	check(!navigable('programs', 'scout') && navigable('programs', 'raise'),
		'navigable: a Raise-only page is never offered to a Scout');
	check(!navigable('pipeline', 'scout') && !navigable('investors', 'scout'),
		'navigable: the other Raise-only chips are dropped too');
	check(navigable('thesis', 'scout') && !navigable('thesis', 'raise'),
		'navigable: a Scout-only page is never offered to a founder');
	// `upsell` is good enough for the sidebar and not for an action.
	check(access(ROUTE_BY_ID.get('recently-funded')!.tier, 'explore', false) === 'upsell'
		&& !navigable('recently-funded', 'explore'),
		'navigable: an upsell route is listed in nav but not offered as a chip');
	// Deck Screener went live: Scout runs the same deck engine in investor mode,
	// so `deck` is now offerable to both products (the `placeholder: { scout }`
	// flag that dropped it is gone).
	check(navigable('deck', 'scout') && navigable('deck', 'raise'),
		'navigable: Deck Screener is offerable now that investor mode is wired');
	check(navigable('deal-flow', 'scout') && navigable('deal-flow-circle', 'scout'),
		'navigable: Deal Flow is offerable now that it is wired');
	check(!navigable('no-such-route', 'scout'), 'navigable: an unknown route id is dropped');
}

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
// `exitCode` rather than `exit()`: on Windows, exiting while stdout still has
// buffered writes trips a libuv assertion, so the check crashes *after*
// printing PASS. Setting the code lets Node flush and exit on its own.
process.exitCode = failures === 0 ? 0 : 1;
