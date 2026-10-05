/**
 * Sample SportsTechX reports and newsletter editions (from the Scout / Explore
 * Claude Designs). Reports and Newsletter are Backend Not Connected for now in
 * every product; replace with /api/reports and /api/newsletter/articles when
 * they're wired up.
 */
export type Access = 'Free' | 'Premium';
export interface SampleResource { title: string; desc: string; date: string; access: Access; tags: string[] }

export const SAMPLE_REPORTS: SampleResource[] = [
	{ title: 'European Sports-Tech Report 2026', desc: 'Funding, exits and company formation across the European sports-tech market, with sector-level breakdowns and a five-year comparison of investment activity.', date: '2026-07-14', access: 'Free', tags: ['Europe', 'All sectors', 'Funding'] },
	{ title: 'Global Sports-Tech Funding Review H1 2026', desc: 'Half-year funding totals by sector, stage and geography.', date: '2026-07-02', access: 'Free', tags: ['Global', 'All sectors', 'Funding'] },
	{ title: 'Venue Technology Landscape', desc: 'Smart venues, access control and the stadium tech stack.', date: '2026-06-24', access: 'Free', tags: ['Europe', 'Venues', 'Market'] },
	{ title: 'India Sports-Tech Report 2026', desc: 'Company formation and funding across India’s sports-tech market.', date: '2026-06-10', access: 'Free', tags: ['India', 'All sectors', 'Funding'] },
	{ title: 'Football Technology Deep Dive', desc: 'Business models, margins and exit routes in football technology.', date: '2026-05-28', access: 'Premium', tags: ['Global', 'Football', 'Market'] },
];

export const SAMPLE_EDITIONS: SampleResource[] = [
	{ title: 'Edition 148 — Wearables consolidate, ticketing splinters', desc: 'Two wearable manufacturers merge in Germany, a European ticketing platform raises a Series B, and three federations publish data-governance guidance. Plus five events worth a place in your calendar.', date: '2026-09-18', access: 'Free', tags: ['Europe', 'All sectors', 'Funding'] },
	{ title: 'Edition 147 — Series A is back in Europe', desc: 'Three European Series A rounds, and why US investors are returning.', date: '2026-09-04', access: 'Free', tags: ['Europe', 'All sectors', 'Funding'] },
	{ title: 'Edition 146 — Clubs buy engagement again', desc: 'Why clubs are spending on fan-engagement software after a quiet year.', date: '2026-08-21', access: 'Free', tags: ['Europe', 'Fans', 'Market'] },
	{ title: 'Edition 145 — Club software consolidates', desc: 'The quiet consolidation of club-management tools.', date: '2026-08-07', access: 'Free', tags: ['Global', 'Executives', 'M&A'] },
	{ title: 'Edition 144 — Hardware margins', desc: 'What performance-tech hardware margins mean for investors.', date: '2026-07-24', access: 'Premium', tags: ['Global', 'Athletes', 'Market'] },
];
