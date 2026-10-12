/**
 * Self-check for the navbar breadcrumb trail. Run it with:
 *   node components/shell/breadcrumbs.check.ts
 *
 * The rule that earns a test flipped: the trail now ends on the page you are
 * on. It used to stop one crumb short, which meant every page in a section
 * rendered the same two crumbs ("Home › Discover") and the trail never said
 * where you were. The cases below are the ones that made the old version look
 * broken, plus the two that made it tempting in the first place — a detail
 * page's unreadable leaf, and an opaque id.
 */
import { crumbsFor, deslug } from './breadcrumbs.ts';
import type { ShellNavEntry } from '../atlas/shell/nav.ts';

// `icon` is required by the type and never read by `crumbsFor`, so the check
// does not drag the icon set into a plain `node` run for it.
const item = (name: string, path: string, extra: Record<string, unknown> = {}) =>
	({ name, path, icon: '', ...extra });

const NAV: ShellNavEntry[] = [
	item('Home', '/home'),
	{ title: 'Discover', items: [item('Companies', '/companies'), item('Signals', '/signals')] },
	{ title: 'Intelligence', items: [item('Analytics', '/analytics', { isDefault: true }), item('Monthly Roundup', '/analytics?tab=roundup')] },
	{ title: 'Watchlists', items: [item('Main watchlist', '/watchlists/abc-123')] },
	item('Account', '/account'),
] as ShellNavEntry[];

const q = (s = '') => new URLSearchParams(s);
const trail = (pathname: string, search = '') => crumbsFor(NAV, '/home', pathname, q(search));
const labels = (pathname: string, search = '') => trail(pathname, search).map((c) => c.label);
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

let failures = 0;
const check = (ok: boolean, msg: string) => {
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
	if (!ok) failures += 1;
};

// ── The trail reaches the current page ─────────────────────────────────────
check(labels('/home').length === 0, 'home has no trail — the Home crumb IS the page');
check(eq(labels('/companies'), ['Discover', 'Companies']), 'a section page names itself, not just its section');
check(eq(labels('/signals'), ['Discover', 'Signals']), 'two pages in one section do not share a trail');
check(eq(labels('/analytics'), ['Intelligence', 'Analytics']), 'the section page reaches its own name');
check(eq(labels('/account'), ['Account']), 'a sectionless page is one crumb');

// The regression that prompted the rewrite: every page in a section used to
// produce the identical two-crumb trail.
check(JSON.stringify(labels('/companies')) !== JSON.stringify(labels('/signals')),
	'sibling pages produce different trails');

// ── The current page is never a link; its ancestors are ────────────────────
check(trail('/companies').at(-1)?.href === undefined, 'the last crumb is the page, so it does not link');
check(trail('/companies')[0]?.href === undefined, 'a section is a grouping label, not a link');
check(trail('/companies/acme-sports').at(-2)?.href === '/companies', 'the parent list links back');

// ── Detail pages ───────────────────────────────────────────────────────────
check(eq(labels('/companies/acme-sports'), ['Discover', 'Companies', 'Acme Sports']),
	'a detail page reads its leaf from the slug');
check(eq(labels('/companies/7f1c0a2e-1111-2222-3333-444444444444'), ['Discover', 'Companies']),
	'an opaque uuid is dropped rather than shown');
check(eq(labels('/companies/12345'), ['Discover', 'Companies']), 'a numeric id is dropped too');
check(eq(labels('/companies/acme/team'), ['Discover', 'Companies', 'Acme']),
	'only the first segment below the list becomes a crumb');

// ── Tabbed pages (a query-carrying nav item) ───────────────────────────────
check(eq(labels('/analytics', 'tab=roundup'), ['Intelligence', 'Monthly Roundup']),
	'a tab resolves to its own nav item');

// ── A nav item that IS the leaf (watchlists splices live lists into the nav) ─
check(eq(labels('/watchlists/abc-123'), ['Watchlists', 'Main watchlist']),
	'a spliced nav item names itself rather than stopping at the section');

// ── Pages with no sidebar entry (chat) ────────────────────────────────────
// Chat is reachable but unlisted, so without the manifest fallback its trail
// stopped at "Home".
const CHAT = { route: { name: 'Chat', path: '/chat' } };
const chatTrail = (pathname: string, leafLabel?: string | null) =>
	crumbsFor(NAV, '/home', pathname, q(), { ...CHAT, leafLabel });
check(eq(chatTrail('/chat').map((c) => c.label), ['Chat']), 'an unlisted page falls back to its manifest name');
check(chatTrail('/chat')[0]?.href === undefined, 'on the page itself, that crumb is not a link');
check(eq(chatTrail('/chat/28f9f0f8-a26e-405b-a1c5-29c8bc27f5fe', 'Show recent sports tech deals').map((c) => c.label),
	['Chat', 'Show recent sports tech deals']), 'a conversation shows its title, not its id');
check(chatTrail('/chat/28f9f0f8-a26e-405b-a1c5-29c8bc27f5fe', 'Deals')[0]?.href === '/chat',
	'and "Chat" links back to a fresh conversation');
check(!chatTrail('/chat/28f9f0f8-a26e-405b-a1c5-29c8bc27f5fe', 'Conversation').some((c) => c.label.includes('28f9f0f8')),
	'the uuid never reaches the trail, even before titles load');
check(eq(labels('/companies'), ['Discover', 'Companies']), 'a nav match still wins over any fallback');

// ── deslug ─────────────────────────────────────────────────────────────────
check(deslug('acme-sports') === 'Acme Sports', 'hyphens become spaces and words are capitalised');
check(deslug('under_score') === 'Under Score', 'underscores too');
check(deslug('MLS-next') === 'MLS Next', 'an all-caps acronym is left alone');
check(deslug('7f1c0a2e-1111-2222-3333-444444444444') === '', 'a uuid de-slugs to nothing');
check(deslug('') === '', 'an empty segment is nothing');
check(deslug('acme%20sports') === 'Acme Sports', 'a percent-encoded segment is decoded');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
process.exitCode = failures === 0 ? 0 : 1;
