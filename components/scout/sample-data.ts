/**
 * Sample data for Scout's placeholder screens (Backend Not Connected), lifted
 * from the Atlas Scout Claude Design. Replace screen by screen as the investor
 * backend lands; nothing here is read from or written to the API.
 */

export interface SampleCompany {
	id: string; name: string; hq: string; founded: number; site: string; desc: string;
	sector: string; sub: string; stage: string; raised: string;
	/** Thesis checks, in CHECKS order: stage, geography, sector, cheque. */
	checks: [boolean, boolean, boolean, boolean];
	reason: string;
}

export const CHECKS = ['Stage', 'Geography', 'Sector', 'Cheque'] as const;

const co = (id: string, name: string, hq: string, founded: number, site: string, desc: string, sector: string, sub: string, stage: string, raised: string, checks: number[], reason: string): SampleCompany =>
	({ id, name, hq, founded, site, desc, sector, sub, stage, raised, checks: checks.map(Boolean) as SampleCompany['checks'], reason });

export const SAMPLE_COMPANIES: SampleCompany[] = [
	co('zenniz', 'Zenniz', 'Espoo, Finland', 2018, 'zenniz.com', 'Automated line calling and smart court infrastructure for tennis clubs.', 'Venues & Infrastructure', 'Smart venues', 'Series A', '€9m', [1, 1, 1, 1], 'Matches your interest in European Seed–Series A performance technology businesses.'),
	co('fanwave', 'Fanwave', 'Lisbon, Portugal', 2020, 'fanwave.io', 'Matchday engagement platform combining live polls, predictions and rewards for clubs.', 'Fan Engagement', 'Interactive experiences', 'Seed', '€3.2m', [1, 1, 1, 1], 'Seed-stage European fan-engagement software with recurring club revenue.'),
	co('playmakers', 'Playmakers', 'Berlin, Germany', 2022, 'playmakers.app', 'Coaching and session-planning platform for grassroots football.', 'Activity & Performance', 'Coaching software', 'Seed', '€0.6m', [1, 1, 1, 1], 'Seed-stage coaching software in Germany; a close match to your thesis.'),
	co('stridelab', 'Stridelab', 'Copenhagen, Denmark', 2021, 'stridelab.app', 'Running gait analysis app for recreational athletes and physio clinics.', 'Health & Wellbeing', 'Injury prevention', 'Seed', '€1.8m', [1, 1, 1, 1], 'Early-stage performance software in the Nordics, within your cheque range.'),
	co('courtside', 'Courtside Data', 'Amsterdam, Netherlands', 2019, 'courtside.ai', 'Computer-vision stats and highlights for amateur basketball leagues.', 'Media & Content', 'Video analytics', 'Series A', '€11m', [1, 1, 0, 1], 'Stage and cheque fit; adjacent to your tracking and analytics interest.'),
	co('tixflow', 'Tixflow', 'Madrid, Spain', 2019, 'tixflow.com', 'Dynamic ticketing and secondary marketplace for mid-size clubs.', 'Management & Operations', 'Ticketing', 'Series A', '€14m', [1, 1, 0, 1], 'Series A in Europe with marketplace economics; outside your core sectors.'),
	co('playermaker', 'Playermaker', 'London, UK', 2016, 'playermaker.com', 'Foot-mounted sensors and analytics for football player development.', 'Activity & Performance', 'Wearables', 'Series B', '€40m', [0, 1, 1, 1], 'Fits your performance-technology interest; round size now above your typical cheque.'),
	co('kinexon', 'Kinexon', 'Munich, Germany', 2012, 'kinexon.com', 'Real-time location and performance tracking for professional teams and venues.', 'Activity & Performance', 'Wearables', 'Series C', '€130m', [0, 1, 1, 0], 'Strong sector and geography fit, but later stage than your Seed–Series A focus.'),
];
export const sampleCompany = (id: string) => SAMPLE_COMPANIES.find((c) => c.id === id);

/** Investment stages used by the watchlist board. */
export const BOARD_STAGES = ['Identified', 'Reviewing', 'Meeting', 'Due Diligence', 'Passed', 'Invested'] as const;
export type BoardStage = typeof BOARD_STAGES[number];

export type DealKind = 'featured' | 'verified' | 'circle';
export interface SampleDeal {
	id: string; kind: DealKind; name: string; hq: string; desc: string; sector: string;
	round: string; target: string; committed: string; pct: number; valuation: string; instrument: string;
	close: string; lead: string; summary: string; fit: boolean; by?: string; pending?: boolean;
}
export const SAMPLE_DEALS: SampleDeal[] = [
	{ id: 'tixflow', kind: 'featured', name: 'Tixflow', hq: 'Madrid, Spain', sector: 'Management & Operations', desc: 'Dynamic ticketing and secondary marketplace for mid-size clubs. Live with 40 clubs across Spain and Portugal; net revenue up 3× year on year. Raising to expand into Germany and the UK.', round: 'Series A', target: '€8m', committed: '€5.1m', pct: 64, valuation: '€38m pre-money', instrument: 'Priced equity', close: 'Dec 2026', lead: 'Lead confirmed', fit: false, summary: 'Tixflow is one of the few ticketing players built for mid-size clubs rather than tier-one leagues. Revenue is transactional and growing 3× year on year; the main question is how quickly the model transfers outside Iberia.' },
	{ id: 'playmakers', kind: 'verified', name: 'Playmakers', hq: 'Berlin, Germany', sector: 'Activity & Performance', desc: 'Coaching and session-planning platform for grassroots football.', round: 'Seed', target: '€2m', committed: '€750k', pct: 38, valuation: 'Not disclosed', instrument: 'Priced equity', close: 'Nov 2026', lead: 'Seeking lead', fit: true, summary: 'Early but capital-efficient: 1,400 grassroots clubs onboarded with a small team. Monetisation through federation partnerships is the key thing to test.' },
	{ id: 'stridelab', kind: 'verified', name: 'Stridelab', hq: 'Copenhagen, Denmark', sector: 'Health & Wellbeing', desc: 'Running gait analysis app for recreational athletes and physio clinics.', round: 'Seed ext.', target: '€1.5m', committed: '€900k', pct: 60, valuation: 'Not disclosed', instrument: 'SAFE', close: 'Jan 2027', lead: 'Existing lead', fit: true, summary: 'Clinic channel is working and gives Stridelab a defensible B2B2C route to recreational runners.' },
	{ id: 'fanwave', kind: 'verified', name: 'Fanwave', hq: 'Lisbon, Portugal', sector: 'Fan Engagement', desc: 'Matchday engagement platform with live polls, predictions and rewards.', round: 'Seed+', target: '€4m', committed: '€2.6m', pct: 65, valuation: '€18m pre-money', instrument: 'Priced equity', close: 'Dec 2026', lead: 'Lead confirmed', fit: true, summary: 'Fast club adoption in Southern Europe with clear upsell into sponsorship inventory.' },
	{ id: 'courtside', kind: 'verified', name: 'Courtside Data', hq: 'Amsterdam, Netherlands', sector: 'Media & Content', desc: 'Computer-vision stats and highlights for amateur basketball leagues.', round: 'Series A+', target: '€6m', committed: '€2m', pct: 33, valuation: 'Not disclosed', instrument: 'Priced equity', close: 'Feb 2027', lead: 'Seeking lead', fit: false, summary: 'Automated production for amateur leagues; expanding from basketball into volleyball.' },
	{ id: 'zenniz', kind: 'verified', name: 'Zenniz', hq: 'Espoo, Finland', sector: 'Venues & Infrastructure', desc: 'Automated line calling and smart court infrastructure for tennis clubs.', round: 'Series A ext.', target: '€3m', committed: '€1.2m', pct: 40, valuation: 'Not disclosed', instrument: 'Convertible', close: 'Jan 2027', lead: 'Existing lead', fit: true, summary: 'Hardware installed in 300+ courts; SaaS attach rate is the metric to watch.' },
	{ id: 'goalbound', kind: 'circle', name: 'Goalbound', hq: 'Dublin, Ireland', sector: 'Management & Operations', desc: 'Recruitment marketplace connecting college athletes with European clubs.', round: 'Pre-seed', target: '€750k', committed: '€200k', pct: 27, valuation: 'Not disclosed', instrument: 'SAFE', close: 'Dec 2026', lead: 'Seeking lead', fit: false, by: 'a Circle angel', summary: 'Shared by a Circle member. Eligibility checked; not independently reviewed.' },
	{ id: 'aquatrack', kind: 'circle', name: 'Aquatrack', hq: 'Lyon, France', sector: 'Activity & Performance', desc: 'Swim-lane sensors and coaching analytics for clubs and pools.', round: 'Seed', target: '€1.5m', committed: '€500k', pct: 33, valuation: 'Not disclosed', instrument: 'Priced equity', close: 'Jan 2027', lead: 'Seeking lead', fit: true, by: 'a Circle fund', summary: 'Shared by a Circle member. Eligibility checked; not independently reviewed.' },
];

/** Disclosed rounds per sample deal (deal page "Funding history"). */
export const DEAL_HISTORY: Record<string, [string, string][]> = {
	tixflow: [['Series A · 04 Sep', '€14m']], playmakers: [['Pre-seed · 02 Aug', '€0.6m']], stridelab: [['Seed · 22 Aug', '€1.8m']],
	fanwave: [['Seed · 16 Sep', '€3.2m']], courtside: [['Series A · 11 Sep', '€11m']], zenniz: [['Series A · 19 Sep', '€6m']],
};

/** Sections of a deal page (design copy; filled in once Deal Flow has a backend). */
export const DEAL_SECTIONS: [string, string][] = [
	['Company', 'What the company does, who buys it and why now.'],
	['Traction', 'Revenue, customers, retention and growth rate as verified by SportsTechX.'],
	['Market', 'Position within the SportsTechX Framework, market size and key competitors.'],
	['Team', 'Founders, key hires and relevant track record.'],
	['Round / Use of funds', 'How the capital will be deployed and the milestones it should reach.'],
];

// ── Investor thesis (Thesis settings + onboarding) ──────────────────────────
export interface Thesis {
	name: string; email: string; role: string; linkedin: string;
	fundName: string; investorType: string; website: string; location: string; aum: string;
	chequeMin: string; chequeMax: string; stages: string[]; invStyle: 'Lead' | 'Follow' | 'Either';
	regions: string[]; sectors: string[]; traction: string; include: string[]; exclude: string[];
}
export const DEFAULT_THESIS: Thesis = {
	name: '', email: '', role: 'Partner', linkedin: '',
	fundName: 'Northline Ventures', investorType: 'Venture capital', website: 'northline.vc', location: 'London, United Kingdom', aum: '€100–250m',
	chequeMin: '€250k', chequeMax: '€2m', stages: ['Seed', 'Series A'], invStyle: 'Either',
	regions: ['Europe', 'USA & Canada', 'DACH'], sectors: ['Activity & Performance', 'Fan Engagement'],
	traction: '€500k+ ARR', include: ['B2B', 'Software', 'Women’s sports', 'Football', 'Tennis'], exclude: ['Betting & prediction', 'Web3 & crypto'],
};

export const THESIS_OPTIONS = {
	investorType: ['Venture capital', 'Angel investor', 'Corporate VC', 'Family office', 'Accelerator / studio', 'Growth / PE'],
	aum: ['Under €25m', '€25–100m', '€100–250m', '€250m–1bn', '€1bn+', 'Not applicable'],
	stages: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'],
	regions: ['USA & Canada', 'DACH', 'APAC'],
	traction: ['Pre-revenue OK', 'Early revenue', '€500k+ ARR', '€2m+ ARR'],
	include: ['B2C', 'Women’s sports'],
	exclude: ['Betting & prediction', 'Web3 & crypto', 'Hardware'],
	invStyle: ['Lead', 'Follow', 'Either'] as const,
};

/** SportsTechX framework sectors by pillar (onboarding + thesis sector chips). */
export const PILLAR_SECTORS: Record<'Athletes' | 'Fans' | 'Executives', string[]> = {
	Athletes: ['Activity & Performance', 'Health & Wellbeing', 'Coaching & Education'],
	Fans: ['Fan Engagement', 'Media & Content', 'Betting & Fantasy'],
	Executives: ['Management & Operations', 'Venues & Infrastructure', 'Commerce & Sponsorship'],
};

/** Full pick lists behind "+ Add" (regions, include/exclude attributes). */
export const PICK_LISTS: Record<'regions' | 'attrs', [string, string[]][]> = {
	regions: [
		['Continents', ['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania', 'Global']],
		['Regions', ['USA & Canada', 'DACH', 'APAC', 'UK & Ireland', 'Nordics', 'France & Benelux', 'Southern Europe', 'CEE', 'Baltics', 'Latin America', 'Middle East', 'MENA', 'Sub-Saharan Africa', 'Southeast Asia']],
		['Europe', ['United Kingdom', 'Ireland', 'Germany', 'Austria', 'Switzerland', 'France', 'Netherlands', 'Belgium', 'Spain', 'Portugal', 'Italy', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Poland', 'Czech Republic', 'Estonia', 'Greece', 'Turkey']],
		['Americas', ['United States', 'Canada', 'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia']],
		['Middle East & Africa', ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Israel', 'South Africa', 'Nigeria', 'Kenya', 'Egypt']],
		['Asia-Pacific', ['Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore', 'India', 'China', 'Indonesia']],
	],
	attrs: [
		['Business model', ['B2B', 'B2C', 'B2B2C', 'D2C', 'Software', 'SaaS', 'Hardware', 'Marketplace', 'Media', 'Data & analytics', 'Services']],
		['Revenue model', ['Subscription', 'Transactional', 'Licensing', 'Advertising', 'Sponsorship', 'Hardware + subscription']],
		['Technology', ['AI / machine learning', 'Computer vision', 'Wearables / IoT', 'AR / VR', 'Web3 & crypto', 'Mobile-first', 'Streaming']],
		['Customer', ['Clubs & teams', 'Leagues & federations', 'Athletes', 'Fans', 'Venues', 'Brands & sponsors', 'Media rights holders', 'Grassroots clubs', 'Consumers']],
		['Themes', ['Betting & prediction', 'Women’s sports', 'Health & wellbeing', 'Sustainability', 'Youth sport', 'Accessibility']],
		['Sports · Team sports', ['Football', 'American football', 'Basketball', 'Rugby', 'Cricket', 'Baseball', 'Ice hockey', 'Handball', 'Volleyball', 'Field hockey']],
		['Sports · Racket sports', ['Tennis', 'Padel', 'Pickleball', 'Badminton', 'Squash', 'Table tennis']],
		['Sports · Endurance & fitness', ['Running', 'Cycling', 'Triathlon', 'Swimming', 'Rowing', 'Gym & fitness', 'Yoga & pilates']],
		['Sports · Individual & combat', ['Golf', 'Athletics', 'Boxing', 'MMA', 'Martial arts', 'Climbing']],
		['Sports · Motor, winter & water', ['Motorsport', 'Skiing', 'Snowboarding', 'Sailing', 'Surfing', 'Equestrian']],
		['Sports · Other', ['Esports', 'Multi-sport', 'Grassroots & youth']],
	],
};
