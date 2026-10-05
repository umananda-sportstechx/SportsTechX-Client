/**
 * Sample company signals (from the Scout Claude Design). Signals are Backend
 * Not Connected in every product: there's no signals feed yet (per-company news
 * is live on company profiles under "Recent signals").
 */
export interface SignalCompany { id: string; name: string; site: string; hq: string; sector: string; stage: string }

export const SIGNAL_COMPANIES: Record<string, SignalCompany> = {
	playermaker: { id: 'playermaker', name: 'Playermaker', site: 'playermaker.com', hq: 'London, UK', sector: 'Activity & Performance', stage: 'Series B' },
	zenniz: { id: 'zenniz', name: 'Zenniz', site: 'zenniz.com', hq: 'Espoo, Finland', sector: 'Venues & Infrastructure', stage: 'Series A' },
	fanwave: { id: 'fanwave', name: 'Fanwave', site: 'fanwave.io', hq: 'Lisbon, Portugal', sector: 'Fan Engagement', stage: 'Seed' },
	stridelab: { id: 'stridelab', name: 'Stridelab', site: 'stridelab.app', hq: 'Copenhagen, Denmark', sector: 'Health & Wellbeing', stage: 'Seed' },
	courtside: { id: 'courtside', name: 'Courtside Data', site: 'courtside.ai', hq: 'Amsterdam, Netherlands', sector: 'Media & Content', stage: 'Series A' },
	kinexon: { id: 'kinexon', name: 'Kinexon', site: 'kinexon.com', hq: 'Munich, Germany', sector: 'Activity & Performance', stage: 'Series C' },
};

export type SignalType = 'Partnership' | 'Funding' | 'Growth' | 'Fundraising' | 'Leadership' | 'Product';
export const SIGNAL_TYPES: SignalType[] = ['Funding', 'Fundraising', 'Growth', 'Partnership', 'Leadership', 'Product'];
export const SAMPLE_SIGNALS: { id: string; type: SignalType; when: string; text: string }[] = [
	{ id: 'playermaker', type: 'Partnership', when: '2 days ago', text: 'Announced a multi-year data partnership with a Premier League academy network.' },
	{ id: 'zenniz', type: 'Funding', when: '4 days ago', text: 'Closed a €6m Series A led by a Nordic growth fund.' },
	{ id: 'fanwave', type: 'Growth', when: '1 week ago', text: 'Now live with 60 clubs across Portugal, Spain and Italy — up from 22 a year ago.' },
	{ id: 'stridelab', type: 'Fundraising', when: '1 week ago', text: 'Founders indicated they are preparing a Seed extension for Q1 2027.' },
	{ id: 'courtside', type: 'Leadership', when: '2 weeks ago', text: 'Hired a former NBA Europe executive as Chief Commercial Officer.' },
	{ id: 'kinexon', type: 'Product', when: '3 weeks ago', text: 'Launched a ball-tracking module for broadcast partners.' },
];

