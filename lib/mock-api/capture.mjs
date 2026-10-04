// Dev tool. Snapshots real public API responses into fixtures/captured.json
// so mock mode shows genuine data. Run with the backend up:
//   node lib/mock-api/capture.mjs [backendUrl]
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const BASE = process.argv[2] ?? (env.match(/^BACKEND_URL=(.+)$/m)?.[1] ?? 'http://localhost:5000').trim();
const FIXTURE = new URL('./fixtures/captured.json', import.meta.url);
// Resume: keep what a previous run already captured.
const out = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (path, params = {}) => {
	const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').sort(([a], [b]) => a.localeCompare(b)));
	return q.toString() ? `${path}?${q}` : path;
};
async function get(path, params) {
	const k = key(path, params);
	if (k in out) return out[k];
	for (let attempt = 0; attempt < 6; attempt++) {
		try {
			await sleep(250);
			const r = await fetch(BASE + k, { signal: AbortSignal.timeout(30000) });
			if (r.status === 429) { await sleep(Number(r.headers.get('retry-after') ?? 0) * 1000 || 5000 * (attempt + 1)); continue; }
			if (!r.ok) { console.log('skip', r.status, k); return null; }
			out[k] = await r.json();
			console.log('ok  ', k);
			return out[k];
		} catch (e) { console.log('fail', k, e.message); return null; }
	}
	console.log('gave up (rate limited)', k);
	return null;
}

const year = new Date().getUTCFullYear();
const month = new Date().getUTCMonth() + 1;

// Reference data
const sectors = await get('/api/sectors');
for (const p of ['/api/sports', '/api/tech-tags', '/api/round-types', '/api/locations/facets', '/api/currencies']) await get(p);

// Market analytics (Analytics tab: 10y / 5y / ytd → periods all / 12m / ytd)
for (const from of [year - 9, year - 4, year]) {
	await get('/api/analytics/annual-funding', { from, to: year });
	await get('/api/analytics/annual-ma', { from, to: year });
}
for (const period of ['all', '12m', 'ytd']) {
	await get('/api/analytics/sector-heat-tree', { period, limit: 8 });
	await get('/api/analytics/ma-sector-heat-tree', { period, limit: 8 });
	await get('/api/analytics/business-model-breakdown', { period });
	await get('/api/analytics/world-flow', { period, limit: 8 });
	await get('/api/analytics/top-funded-companies', { period, limit: 10 });
	await get('/api/analytics/top-acquirers', { period, limit: 10 });
}

// Monthly roundup: last 6 months + matching deals lists
for (let i = 0; i < 6; i++) {
	const d = new Date(Date.UTC(year, month - 1 - i, 1));
	await get('/api/market/roundup', { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
}

// Catalogues (default first pages)
const companies = await get('/api/companies', { limit: 24, page: 1, sort: '-created_at' });
await get('/api/companies', { limit: 24, page: 2, sort: '-created_at' });
const investors = await get('/api/investors', { limit: 24, page: 1, sort: '-created_at' });
await get('/api/investors', { limit: 24, page: 2, sort: '-created_at' });
await get('/api/ecosystem-entities', { entity_type: 'program', limit: 24, page: 1, sort: '-created_at' });
await get('/api/ecosystem-entities', { entity_type: 'event', limit: 24, page: 1, sort: 'start_date', upcoming_only: true });
await get('/api/ecosystem-entities', { entity_type: 'event', limit: 24, page: 1, sort: '-start_date' });

// Framework: per-category counts + example companies (category + its children)
const list = Array.isArray(sectors) ? sectors : (sectors?.data ?? []);
for (const cat of list.filter((s) => s.parent_id && list.some((p) => p.id === s.parent_id && !p.parent_id))) {
	const slugs = [cat.slug, ...list.filter((s) => s.parent_id === cat.id).map((s) => s.slug)].join(',');
	await get('/api/companies', { limit: 1, page: 1, sector_slug: slugs });
	await get('/api/companies', { limit: 4, page: 1, sector_slug: slugs, sort: '-total_funding' });
}

// Details for the first page of companies / investors (drawer, profile pages)
for (const c of [...(companies?.data ?? []), ...((await get('/api/companies', { limit: 24, page: 2, sort: '-created_at' }))?.data ?? [])]) {
	const id = c.slug ?? c.id;
	await get(`/api/companies/${id}`);
	await get('/api/deals', { company_id: c.id, limit: 30, sort: '-announced_date' });
	// Company profile page: sports, news (signals), related companies.
	for (const sub of ['sports', 'news', 'similar']) await get(`/api/companies/${id}/${sub}`);
}
for (const v of (investors?.data ?? []).slice(0, 24)) {
	await get(`/api/investors/${v.id}`);
	await get(`/api/investors/${v.id}/thesis`);
	await get('/api/deals', { investor_id: v.id, limit: 12, sort: '-announced_date' });
}

writeFileSync(FIXTURE, JSON.stringify(out));
console.log(`\nSaved ${Object.keys(out).length} responses → lib/mock-api/fixtures/captured.json`);
