/**
 * Self-check for the navbar breadcrumb trail. Run it with:
 *   node components/shell/breadcrumbs.check.ts
 *
 * The rule that earns a test is "never show the page you are on". Get it wrong
 * and the trail silently duplicates the `H1` on ~28 of the 38 authenticated
 * pages — which looks like a styling mistake, not a logic one, so nobody traces
 * it back here.
 */
import { crumbsFor } from './breadcrumbs.ts';
import type { ShellNavEntry } from '../atlas/shell/nav.ts';

// `icon` is required by the type and never read by `crumbsFor`, so the check
// does not drag lucide into a plain `node` run for it.
const item = (name: string, path: string, extra: Record<string, unknown> = {}) =>
	({ name, path, icon: null as unknown as never, ...extra });

const NAV: ShellNavEntry[] = [
	item('Home', '/home'),
	{ title: 'Discover', items: [item('Companies', '/companies'), item('Signals', '/signals')] },
	{ title: 'Intelligence', items: [item('Analytics', '/analytics', { isDefault: true }), item('Monthly Roundup', '/analytics?tab=roundup')] },
	{ title: 'Watchlists', items: [item('Main watchlist', '/watchlists/abc-123')] },
	item('Account', '/account'),
] as ShellNavEntry[];

const q = (s = '') => new URLSearchParams(s);
const labels = (pathname: string, search = '') =>
	crumbsFor(NAV, '/home', pathname, q(search)).map((c) => c.label);

let failures = 0;
const check = (ok: boolean, msg: string) => {
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
	if (!ok) failures += 1;
};

// ── The core rule: the current page is never in the trail ───────────────────
check(labels('/home').length === 0, 'home has no trail — the Home crumb IS the page');
check(JSON.stringify(labels('/companies')) === JSON.stringify(['Discover']),
	'a section page shows its section only, never its own name');
check(JSON.stringify(labels('/analytics')) === JSON.stringify(['Intelligence']),
	'the H1 ("Intelligence") is not repeated by a second crumb');

// ── Detail pages: the parent becomes an ancestor, the leaf is never invented ─
check(JSON.stringify(labels('/companies/acme-sports')) === JSON.stringify(['Discover', 'Companies']),
	'a detail page adds its parent as an ancestor');
check(crumbsFor(NAV, '/home', '/companies/acme-sports', q()).at(-1)?.href === '/companies',
	'that ancestor is a link back to the list');
check(crumbsFor(NAV, '/home', '/companies', q())[0]?.href === undefined,
	'a section is a grouping label, not a link');
// The whole reason the trail stops short: nothing publishes "Acme Sports".
check(!labels('/companies/acme-sports').includes('acme-sports'),
	'a raw slug never leaks into the trail');

// ── Tabbed pages (a query-carrying nav item) ────────────────────────────────
check(JSON.stringify(labels('/analytics', 'tab=roundup')) === JSON.stringify(['Intelligence']),
	'a tab is part of the current page, not an extra crumb');

// ── A nav item that IS the leaf (watchlists splices live lists into the nav) ─
check(JSON.stringify(labels('/watchlists/abc-123')) === JSON.stringify(['Watchlists']),
	'when the nav item is the page itself it is omitted, not repeated');

// ── Pages outside every section ─────────────────────────────────────────────
check(labels('/account').length === 0, 'a top-level page has no ancestors but Home');
check(labels('/not-a-route').length === 0, 'an unknown path degrades to just Home, it does not throw');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
process.exitCode = failures === 0 ? 0 : 1;
