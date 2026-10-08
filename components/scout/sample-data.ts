/**
 * Reference data for Scout screens.
 *
 * This was the sample-data file for Scout's placeholder screens. The sample
 * companies and the whole Deal Flow cluster are gone — Deal Flow reads the API
 * now — and what is left is real reference data the live thesis stack and the
 * watchlist board depend on: `Thesis` and its option lists are used by
 * `use-thesis.ts`, `thesis-form.tsx`, `thesis-fields.tsx`, `thesis-codec.ts`
 * and Scout onboarding, none of which are placeholders.
 *
 * The filename is historical; it is kept so those six importers stay put.
 */

/** Investment stages used by the watchlist board. */
export const BOARD_STAGES = ['Identified', 'Reviewing', 'Meeting', 'Due Diligence', 'Passed', 'Invested'] as const;
export type BoardStage = typeof BOARD_STAGES[number];

// ── Investor thesis (Thesis settings + onboarding) ──────────────────────────
export interface Thesis {
	name: string; email: string; role: string; linkedin: string;
	fundName: string; investorType: string; website: string; location: string; aum: string;
	chequeMin: string; chequeMax: string; stages: string[]; invStyle: 'Lead' | 'Follow' | 'Either';
	regions: string[]; sectors: string[]; traction: string; include: string[]; exclude: string[];
}
/**
 * An empty thesis, not a sample one.
 *
 * This used to be a fully populated fictional fund ("Northline Ventures",
 * €100–250m, Seed/Series A, Europe…). That was harmless while the thesis lived
 * in localStorage, but now that it is the fallback behind a real API it would
 * show an investor someone else's thesis the moment a read failed — and a
 * blank form is the honest answer to "we don't know yet". `role` and
 * `invStyle` keep neutral defaults because the form needs one selected.
 */
export const DEFAULT_THESIS: Thesis = {
	name: '', email: '', role: 'Partner', linkedin: '',
	fundName: '', investorType: '', website: '', location: '', aum: '',
	chequeMin: '', chequeMax: '', stages: [], invStyle: 'Either',
	regions: [], sectors: [],
	traction: '', include: [], exclude: [],
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
