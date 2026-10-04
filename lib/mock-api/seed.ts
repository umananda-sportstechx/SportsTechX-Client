/* eslint-disable @typescript-eslint/no-explicit-any -- local-only mock fixtures */
/**
 * Seed data for the mock API's logged-in endpoints. Built from the
 * captured public data where possible (real investor/company names). Edit
 * freely; reset in the browser console with `window.__stxMockReset()`.
 */

type Row = Record<string, any> & { id: string; name: string };

export interface PipeRow {
	id: string; investor_id: string | null; custom_name: string | null;
	investor_name: string | null; investor_slug: string | null; investor_logo_url: string | null; investor_website: string | null;
	stage: string; contact_name: string | null; potential_amount: string | null; last_contact_at: string | null;
	next_step: string | null; next_step_due: string | null; notes: string | null; is_archived: boolean;
}
export interface Deck { id: string; filename: string | null; status: string; overall_score: number | null; created_at: string; analysis_md: string | null; result_json: any }
export interface Conversation { id: string; title: string | null; last_message_at: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }

export interface MockState {
	profile: Record<string, any>;
	features: Array<{ id: number; slug: string; name: string; free: boolean; growth: boolean; pro: boolean }>;
	raise: Record<string, any> | null;
	criteria: Record<string, any> | null;
	strategy: { status: string; scheduled_at: string | null; next_eligible_at: string | null; steps: { label: string; done: boolean }[] };
	market: Record<string, any>;
	pipeline: PipeRow[];
	activity: Record<string, Array<{ type: string; payload: Record<string, unknown> | null; occurred_at: string }>>;
	decks: Deck[];
	conversations: Conversation[];
	favorites: Record<string, Array<Record<string, string>>>;
	companyWatchlists: Array<{ id: string; name: string; description: string | null; color: string | null; company_ids: string[] }>;
	ledger: Array<{ id: string; transaction_type: string; amount: number; description: string | null; display_name: string | null; occurred_at: string }>;
}

const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
const date = (n: number) => day(n).slice(0, 10);

function rowsFrom(captured: Record<string, unknown>, path: string): Row[] {
	const k = Object.keys(captured).find((x) => x.startsWith(path + '?') && x.includes('page=1') && !x.includes('sector_slug'));
	return ((k ? (captured[k] as { data?: Row[] }).data : null) ?? []);
}

export function seedState(captured: Record<string, unknown>): MockState {
	const investors = rowsFrom(captured, '/api/investors');
	const companies = rowsFrom(captured, '/api/companies');

	const stages: Array<[string, Partial<PipeRow>]> = [
		['target', { next_step: 'Send intro email', next_step_due: date(3) }],
		['target', {}],
		['contacted', { contact_name: 'Partner', next_step: 'Follow up on deck', next_step_due: date(-2), last_contact_at: day(-9) }],
		['in_conversation', { contact_name: 'Principal', potential_amount: '250000', next_step: 'Second call', next_step_due: date(5), last_contact_at: day(-3) }],
		['due_diligence', { contact_name: 'Investment Manager', potential_amount: '500000', next_step: 'Share data room', next_step_due: date(-1), last_contact_at: day(-1) }],
		['committed', { contact_name: 'Managing Partner', potential_amount: '300000', last_contact_at: day(-12) }],
	];
	const pipeline: PipeRow[] = stages.map(([stage, extra], i) => {
		const inv = investors[i];
		return {
			id: `pipe-${i + 1}`, investor_id: inv?.id ?? null, custom_name: inv ? null : `Investor ${i + 1}`,
			investor_name: inv?.name ?? null, investor_slug: inv?.slug ?? null, investor_logo_url: inv?.logo_url ?? null, investor_website: inv?.website ?? null,
			stage, contact_name: null, potential_amount: null, last_contact_at: null, next_step: null, next_step_due: null, notes: null, is_archived: false,
			...extra,
		};
	});
	const activity: MockState['activity'] = Object.fromEntries(pipeline.map((p, i) => [p.id, [
		...(p.stage !== 'target' ? [{ type: 'stage_change', payload: { from: 'target', to: p.stage }, occurred_at: day(-i - 1) }] : []),
		{ type: 'created', payload: null, occurred_at: day(-i - 14) },
	]]));

	const scorecard = {
		overall_score: 71,
		verdict: 'A credible deck with a clear problem and early traction. The market sizing and go-to-market need more evidence before Series A conversations, and the financial plan should tie hiring to milestones.',
		sections: [
			{ key: 'problem', label: 'Problem', score: 8, page_refs: [2], quote: 'Clubs lose 30% of season-ticket holders each year.' },
			{ key: 'solution', label: 'Solution', score: 7, page_refs: [3], quote: null },
			{ key: 'market', label: 'Market', score: 5, page_refs: [5], quote: null },
			{ key: 'product', label: 'Product', score: 7, page_refs: [4], quote: null },
			{ key: 'business_model', label: 'Business model', score: 6, page_refs: [7], quote: null },
			{ key: 'competition', label: 'Competition', score: 6, page_refs: [8], quote: null },
			{ key: 'gtm', label: 'Go-to-market', score: 5, page_refs: [9], quote: null },
			{ key: 'traction', label: 'Traction', score: 8, page_refs: [6], quote: '14 clubs live, 3x ARR in 12 months.' },
			{ key: 'financials', label: 'Financials', score: 6, page_refs: [11], quote: null },
			{ key: 'team', label: 'Team', score: 8, page_refs: [10], quote: null },
			{ key: 'ask', label: 'The ask', score: 7, page_refs: [12], quote: null },
		],
		strengths: ['Clear, specific problem statement', 'Strong early traction with named clubs', 'Experienced founding team'],
		risks: ['Market size relies on top-down estimates', 'Go-to-market beyond the first league is unproven', 'Use of funds is not tied to milestones'],
		suggestions: [
			{ area: 'Market', suggestion: 'Rebuild the market size bottom-up from clubs × average contract value.', page_ref: 5, quote: null },
			{ area: 'Go-to-market', suggestion: 'Show the playbook for entering a second league, with pipeline evidence.', page_ref: 9, quote: null },
			{ area: 'Financials', suggestion: 'Tie each hire in the use of funds to a revenue milestone.', page_ref: 11, quote: null },
		],
	};
	const analysisMd = `## Overall\n\n${scorecard.verdict}\n\n## Strengths\n\n${scorecard.strengths.map((s) => `- ${s}`).join('\n')}\n\n## Main investor concerns\n\n${scorecard.risks.map((s) => `- ${s}`).join('\n')}\n`;

	return {
		profile: {
			id: '2ec397d8-8e0c-415d-9ead-d56290c892db', email: 'vishnu@sportstechx.com', full_name: 'Vishnu Dixit', display_name: 'Vishnu',
			referral_code: null, user_role: 'admin', user_type: 'raise', user_type_detail: null, account_type: 'founder',
			paywall_shown_at: day(-60), avatar_url: null, company_name: 'SportsTechX', job_title: 'Founder',
			is_trial: false, trial_ends_at: null, stripe_customer_id: null, intercom_hash: null,
			notification_newsletter: true, notification_email: true, notification_marketing: false, notification_updates: true,
			notification_funding_alerts: true, notification_ma_alerts: false, notification_report_releases: true, notification_programs_deadline: false,
			onboarding_stage: null, onboarding_complete_free: true, onboarding_complete_growth: true, onboarding_complete_pro: true, created_at: day(-300),
		},
		features: [
			{ id: 1, slug: 'advanced_filters', name: 'Advanced filters', free: false, growth: true, pro: true },
			{ id: 2, slug: 'company_contacts', name: 'Company contacts', free: false, growth: false, pro: true },
			{ id: 3, slug: 'exports', name: 'Exports', free: false, growth: true, pro: true },
		],
		raise: {
			company_id: companies[0]?.id ?? null, company_name: 'SportsTechX', company_website: 'https://sportstechx.com',
			hq_country: 'Germany', hq_city: 'Berlin', company_description: 'Fan-engagement platform for clubs and leagues.',
			company_sector_id: null, company_category: [], company_stage: 'seed', revenue_status: 'generating',
			fundraising_process: 'approaching', round_type: 'seed', target_amount: '1500000', committed_amount: '300000', currency_code: 'EUR',
			target_close_date: date(90), lead_investor_status: 'in_discussion', structure: 'equity', valuation: '€8M pre-money',
			prior_capital_raised: '400000', last_round_date: date(-420), annual_revenue: '420000', revenue_growth_pct: '180',
			paying_customers: '14', monthly_burn: '60000', runway_months: '11', strongest_traction: '14 clubs live, 3x ARR in 12 months',
			pitch_deck_status: 'have', financial_model_status: 'ready', data_room_status: 'in_progress', has_target_list: true, setup_completed: true,
		},
		criteria: {
			investor_types: ['VC', 'Angel'], geographies: ['Europe'], cheque_min: '100000', cheque_max: '750000',
			lead_preference: 'both', strategic_ok: true, desired_expertise: ['Commercial partnerships', 'International expansion'],
			excluded_investor_ids: [], biggest_concern: 'access',
		},
		strategy: { status: 'available', scheduled_at: null, next_eligible_at: null, steps: [{ label: 'Complete setup', done: true }, { label: 'Analyse your deck', done: true }, { label: 'Add five investors', done: true }] },
		market: {
			tam: '18400000000', sam: '2100000000', cagr: '11.8', classification: 'Fans & Content › Fan Experiences',
			insight_md: 'Fan-engagement spend is shifting from broadcast to owned club channels. Ticketing and loyalty platforms that bundle data products are drawing the most capital in Europe.',
			methodology: {
				approach: 'TAM from global club and league digital spend; SAM narrowed to European football and basketball clubs.',
				grounded: { sector: 'Fan Experiences', total_funding_usd: 4800000000, funded_companies: 412, companies_tracked: 983, deals: 1290, funding_cagr_pct: 9.4 },
				assumptions: ['Average contract value of €45k per club per year', 'Adoption ceiling of 35% of professional clubs'],
				sources: ['SportsTechX database'],
			},
			competitors: companies.slice(0, 8).map((c) => ({ id: c.id, name: c.name, website: c.website, custom_logo_url: c.custom_logo_url, hq_country: c.hq_country, funding: c.total_funding_usd ? `$${(Number(c.total_funding_usd) / 1e6).toFixed(1)}M raised` : 'Funding undisclosed' })),
			updated_at: day(-2),
		},
		pipeline, activity,
		decks: [{ id: 'deck-1', filename: 'SportsTechX Seed Deck.pdf', status: 'done', overall_score: 71, created_at: day(-6), analysis_md: analysisMd, result_json: scorecard }],
		conversations: [{
			id: 'conv-1', title: 'Which investors should I prioritise?', last_message_at: day(-1),
			messages: [
				{ role: 'user', content: 'Which investors should I prioritise?' },
				{ role: 'assistant', content: '**Mock mode** — sample conversation. Start with investors already in conversation, then those whose recent deals match your stage and sector.' },
			],
		}],
		favorites: {},
		companyWatchlists: [
			{ id: 'wl-1', name: 'Football Infrastructure', description: null, color: '#4C1D95', company_ids: companies.slice(0, 3).map((c) => c.id) },
			{ id: 'wl-2', name: 'Portfolio Competitors', description: null, color: '#1479FF', company_ids: companies.slice(3, 5).map((c) => c.id) },
		],
		ledger: [
			{ id: 'l1', transaction_type: 'grant', amount: 500, description: 'Monthly credits', display_name: 'Monthly grant', occurred_at: day(-5) },
			{ id: 'l2', transaction_type: 'usage', amount: -50, description: 'Pitch deck analysis', display_name: 'Deck analysis', occurred_at: day(-6) },
		],
	};
}
