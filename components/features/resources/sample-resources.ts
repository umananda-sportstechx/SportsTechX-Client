/**
 * The render contract for Reports and Newsletter cards, plus the remaining
 * sample reports.
 *
 * `SampleResource` is what `ResourceCard` / `ResourceLibrary` read, so each
 * feed maps its own API rows onto it. Newsletter is live
 * (`/api/newsletter/articles`). Reports still needs `reports.tags` on the
 * server before it can be connected, so `SAMPLE_REPORTS` stays for now and the
 * screen keeps its placeholder tag.
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
