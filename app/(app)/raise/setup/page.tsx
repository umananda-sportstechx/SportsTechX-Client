'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Check, Loader2, Search } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Screen, H1, Card, Field, Input, Select, Button, Loading } from '@/components/atlas/kit';
import { Logo } from '@/components/atlas/entity-logo';
import { InvestorExclude } from '@/components/atlas/investor-exclude';

/** A company row from /api/companies used to prefill + link Step 1. */
interface CoRow { id: string; name: string; website: string | null; description: string | null; sector_id: string | null; hq_country: string | null; hq_city: string | null; custom_logo_url: string | null }

/**
 * Atlas Raise — first-login setup wizard (Notion "Raise Setup Questionnaire") +
 * transition screen (mock-up 02). Progressive auto-save: each step PATCHes
 * /api/raise; the final step PUTs criteria and flips setup_completed. On the Atlas kit.
 */
type Rec = Record<string, unknown>;
const STEPS = ['Company', 'Your raise', 'History & traction', 'What’s ready', 'Investors'] as const;

export default function RaiseSetupPage() {
	const router = useRouter();
	const { data, isLoading, mutate } = useSWR<{ raise: Rec | null; criteria: Rec | null }>(qk.raise.current());
	const [step, setStep] = useState(0);
	const [saving, setSaving] = useState(false);
	const [done, setDone] = useState(false);
	const [form, setForm] = useState<Rec>({});
	const [crit, setCrit] = useState<Rec>({});
	const [errors, setErrors] = useState<Set<string>>(new Set());
	// When set, the founder's raise is LINKED to an existing master company (company_id).
	// Company facts are prefilled from it; editing them here only updates the founder's
	// raise snapshot — the master company is changed only via admin-approved verification.
	const [linked, setLinked] = useState<{ id: string; name: string } | null>(null);

	// Seed the wizard from any saved draft ONCE — later background revalidations must
	// not clobber the founder's in-progress edits on the current step.
	const hydrated = useRef(false);
	useEffect(() => {
		if (hydrated.current || !data) return;
		if (data.raise) setForm(data.raise);
		if (data.criteria) setCrit(data.criteria);
		// Restore the linked-company banner from a resumed draft.
		if (data.raise?.company_id) setLinked({ id: String(data.raise.company_id), name: String(data.raise.company_name ?? 'your company') });
		hydrated.current = true;
	}, [data]);

	// Track edited fields so a step's save submits only what the founder changed —
	// a stale/malformed value seeded from a resumed draft can't reject the save.
	const dirty = useRef<Set<string>>(new Set());
	const dirtyC = useRef<Set<string>>(new Set());
	const set = (k: string, v: unknown) => { dirty.current.add(k); setForm((f) => ({ ...f, [k]: v })); };
	const setC = (k: string, v: unknown) => { dirtyC.current.add(k); setCrit((c) => ({ ...c, [k]: v })); };

	// Atlas taxonomy (Notion Step 1 "category"): pick the most specific sector — its
	// full path (Root → Sub → Leaf) is stored as company_category for display, and
	// company_sector_id drives Market + investor matching.
	const { data: sectors } = useSWR<Array<{ id: string; name: string; parent_id: string | null }>>(qk.reference.sectors());
	const sectorOptions = useMemo<[string, string][]>(() => {
		const list = sectors ?? [];
		const byId = new Map(list.map((s) => [s.id, s]));
		const path = (s: { name: string; parent_id: string | null }): string => {
			const parts = [s.name]; let p = s.parent_id;
			while (p) { const par = byId.get(p); if (!par) break; parts.unshift(par.name); p = par.parent_id; }
			return parts.join(' → ');
		};
		const isLeaf = (id: string) => !list.some((x) => x.parent_id === id);
		return list.filter((s) => isLeaf(s.id)).map((s) => [s.id, path(s)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [sectors]);
	const pickSector = (id: string) => {
		set('company_sector_id', id || null);
		const label = sectorOptions.find(([v]) => v === id)?.[1];
		set('company_category', id && label ? label.split(' → ') : null);
	};

	// Link an existing master company: prefill the company facts into the raise
	// snapshot + store company_id. Editing them afterwards only touches the raise
	// snapshot; the master company is edited only via admin-approved verification.
	const pickCompany = (c: CoRow) => {
		set('company_id', c.id);
		set('company_name', c.name);
		set('company_website', c.website ?? '');
		set('company_description', c.description ?? '');
		set('hq_country', c.hq_country ?? '');
		set('hq_city', c.hq_city ?? '');
		if (c.sector_id) pickSector(c.sector_id);
		setLinked({ id: c.id, name: c.name });
	};
	// Unlink → treat as a new company (admins approve it later via verification).
	const unlinkCompany = () => { set('company_id', null); setLinked(null); };

	const stepFields = useMemo<string[][]>(() => [
		['company_id', 'company_name', 'company_website', 'hq_country', 'hq_city', 'company_description', 'company_sector_id', 'company_category', 'company_stage', 'revenue_status'],
		['fundraising_process', 'round_type', 'target_amount', 'committed_amount', 'currency_code', 'target_close_date', 'lead_investor_status', 'structure', 'valuation'],
		['prior_capital_raised', 'last_round_date', 'annual_revenue', 'revenue_growth_pct', 'paying_customers', 'monthly_burn', 'runway_months', 'strongest_traction'],
		['pitch_deck_status', 'financial_model_status', 'data_room_status', 'has_target_list'],
	], []);

	// Required fields per step (Notion "Required: Yes"). Validated client-side so
	// setup can't complete with gaps (e.g. an empty Category → no sector → dead Market).
	const REQUIRED: { key: string; label: string; kind?: 'array' | 'bool' }[][] = [
		[{ key: 'company_name', label: 'Company name' }, { key: 'company_website', label: 'Website' }, { key: 'hq_country', label: 'Country' }, { key: 'hq_city', label: 'City' }, { key: 'company_description', label: 'What the company does' }, { key: 'company_sector_id', label: 'Category' }, { key: 'company_stage', label: 'Stage' }, { key: 'revenue_status', label: 'Revenue status' }],
		[{ key: 'fundraising_process', label: 'Fundraising process' }, { key: 'round_type', label: 'Round' }, { key: 'target_amount', label: 'Amount raising' }, { key: 'committed_amount', label: 'Already committed' }, { key: 'target_close_date', label: 'Target close date' }, { key: 'lead_investor_status', label: 'Lead investor' }, { key: 'structure', label: 'Structure' }],
		[{ key: 'prior_capital_raised', label: 'Prior capital raised' }, { key: 'last_round_date', label: 'Last round date' }, { key: 'annual_revenue', label: 'Annual revenue / ARR' }, { key: 'monthly_burn', label: 'Monthly burn' }, { key: 'runway_months', label: 'Runway months' }],
		[{ key: 'pitch_deck_status', label: 'Pitch deck' }, { key: 'financial_model_status', label: 'Financial model' }, { key: 'data_room_status', label: 'Data room' }, { key: 'has_target_list', label: 'Investor target list', kind: 'bool' }],
		[{ key: 'investor_types', label: 'Investor types', kind: 'array' }, { key: 'geographies', label: 'Geographies', kind: 'array' }, { key: 'cheque_min', label: 'Cheque minimum' }, { key: 'cheque_max', label: 'Cheque maximum' }, { key: 'lead_preference', label: 'Lead/follower preference' }, { key: 'strategic_ok', label: 'Strategic preference', kind: 'bool' }],
	];
	const isEmpty = (v: unknown, kind?: 'array' | 'bool') =>
		kind === 'array' ? !Array.isArray(v) || v.length === 0
			: kind === 'bool' ? v !== true && v !== false
				: v === undefined || v === null || v === '';
	const validate = (i: number): { key: string; label: string }[] => {
		const src = i === STEPS.length - 1 ? crit : form;
		const missing = (REQUIRED[i] ?? []).filter((r) => isEmpty(src[r.key], r.kind));
		setErrors(new Set(missing.map((r) => r.key)));
		return missing;
	};

	const saveStep = async (i: number) => {
		const keys = stepFields[i] ?? [];
		const payload = Object.fromEntries(keys.filter((k) => dirty.current.has(k) && form[k] !== '').map((k) => [k, form[k]]));
		if (Object.keys(payload).length === 0) return;
		await apiRequest('PATCH', '/api/raise', payload);
	};

	const next = async () => {
		const miss = validate(step);
		if (miss.length) { toast.error(`Please complete: ${miss.map((r) => r.label).join(', ')}`); return; }
		setSaving(true);
		try { await saveStep(step); void mutate(); setErrors(new Set()); setStep((x) => Math.min(x + 1, STEPS.length - 1)); }
		catch (e) { toast.error((e as Error).message ?? 'Could not save'); }
		finally { setSaving(false); }
	};

	const finish = async () => {
		const miss = validate(STEPS.length - 1);
		if (miss.length) { toast.error(`Please complete: ${miss.map((r) => r.label).join(', ')}`); return; }
		setSaving(true);
		try {
			const critPayload = Object.fromEntries(
				['investor_types', 'geographies', 'cheque_min', 'cheque_max', 'lead_preference', 'strategic_ok', 'desired_expertise', 'excluded_investor_ids', 'biggest_concern']
					.filter((k) => dirtyC.current.has(k) && crit[k] !== '').map((k) => [k, crit[k]]),
			);
			await apiRequest('PUT', '/api/raise/criteria', critPayload);
			await apiRequest('PATCH', '/api/raise', { setup_completed: true });
			setDone(true);
		} catch (e) { toast.error((e as Error).message ?? 'Could not build your plan'); }
		finally { setSaving(false); }
	};

	if (isLoading) return <Screen><Loading /></Screen>;
	if (done) return <Screen width={620}><TransitionScreen onEnter={() => router.push('/raise')} /></Screen>;

	return (
		<Screen width={720}>
			<div style={{ marginBottom: 24 }}>
				<div style={{ fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-navy)', marginBottom: 10 }}>
					Set up your raise · Step {step + 1} of {STEPS.length}
				</div>
				<div style={{ display: 'flex', gap: 6 }}>
					{STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--a-navy)' : 'var(--a-inset)' }} />)}
				</div>
				<H1 className="atlas-h1" >{STEPS[step]}</H1>
			</div>

			<Card style={{ padding: 24 }}>
				{errors.size > 0 && (
					<div style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #F1D6D6', background: 'var(--a-danger-bg, #FCEBEB)', color: 'var(--a-danger, #A32D2D)', padding: '10px 14px', fontSize: 13 }}>
						Required — please complete: {(REQUIRED[step] ?? []).filter((r) => errors.has(r.key)).map((r) => r.label).join(', ')}.
					</div>
				)}
				<div style={{ display: 'grid', gap: 16 }}>
					{step === 0 && <>
						{linked ? (
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid var(--a-border)', borderRadius: 10, padding: '12px 14px', background: 'var(--a-navy-soft)' }}>
								<div style={{ fontSize: 13, color: 'var(--a-ink)' }}>Linked to <strong>{linked.name}</strong> from the Atlas database. You can verify your company later to manage its public profile.</div>
								<button type="button" className="atlas-btn atlas-btn--ghost atlas-btn--sm" onClick={unlinkCompany} style={{ flexShrink: 0 }}>Not your company?</button>
							</div>
						) : (
							<CompanySearch onPick={pickCompany} />
						)}
						<Field label="Company name"><Input value={s(form.company_name)} onChange={(e) => set('company_name', e.target.value)} /></Field>
						<Field label="Website"><Input placeholder="https://" value={s(form.company_website)} onChange={(e) => set('company_website', e.target.value)} /></Field>
						<Grid><Field label="Country"><Input value={s(form.hq_country)} onChange={(e) => set('hq_country', e.target.value)} /></Field><Field label="City"><Input value={s(form.hq_city)} onChange={(e) => set('hq_city', e.target.value)} /></Field></Grid>
						<Field label="What does the company do?"><Input placeholder="One sentence" value={s(form.company_description)} onChange={(e) => set('company_description', e.target.value)} /></Field>
						<Field label="Which category best describes the company?"><Select placeholder="Select the closest Atlas category…" value={s(form.company_sector_id)} onChange={(e) => pickSector(e.target.value)} options={sectorOptions} /></Field>
						<Grid>
							<Field label="Stage"><Select placeholder="Select…" value={s(form.company_stage)} onChange={(e) => set('company_stage', e.target.value)} options={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['other', 'Other']]} /></Field>
							<Field label="Generating revenue?"><Select placeholder="Select…" value={s(form.revenue_status)} onChange={(e) => set('revenue_status', e.target.value)} options={[['pre_revenue', 'Pre-revenue'], ['generating', 'Yes']]} /></Field>
						</Grid>
					</>}

					{step === 1 && <>
						<Field label="Where are you in the fundraising process?"><Select placeholder="Select…" value={s(form.fundraising_process)} onChange={(e) => set('fundraising_process', e.target.value)} options={[['exploring', 'Exploring'], ['preparing', 'Preparing'], ['approaching', 'Actively approaching investors'], ['due_diligence', 'In due diligence'], ['negotiating', 'Negotiating terms']]} /></Field>
						<Field label="What round are you raising?"><Select placeholder="Select…" value={s(form.round_type)} onChange={(e) => set('round_type', e.target.value)} options={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['bridge', 'Bridge'], ['other', 'Other']]} /></Field>
						<Grid><Field label="How much are you raising?"><Input type="number" min={0} value={s(form.target_amount)} onChange={(e) => set('target_amount', e.target.value)} /></Field><Field label="Already committed"><Input type="number" min={0} value={s(form.committed_amount)} onChange={(e) => set('committed_amount', e.target.value)} /></Field></Grid>
						<Grid>
							<Field label="Currency"><Select value={s(form.currency_code) || 'EUR'} onChange={(e) => set('currency_code', e.target.value)} options={[['EUR', 'EUR'], ['USD', 'USD'], ['GBP', 'GBP']]} /></Field>
							<Field label="Target close date"><Input type="date" value={s(form.target_close_date)} onChange={(e) => set('target_close_date', e.target.value)} /></Field>
						</Grid>
						<Grid>
							<Field label="Lead investor?"><Select placeholder="Select…" value={s(form.lead_investor_status)} onChange={(e) => set('lead_investor_status', e.target.value)} options={[['yes', 'Yes'], ['no', 'No'], ['in_discussion', 'In discussion']]} /></Field>
							<Field label="Structure"><Select placeholder="Select…" value={s(form.structure)} onChange={(e) => set('structure', e.target.value)} options={[['equity', 'Equity'], ['safe', 'SAFE'], ['convertible', 'Convertible'], ['undecided', 'Undecided'], ['other', 'Other']]} /></Field>
						</Grid>
						<Field label="Target valuation (optional)"><Input placeholder="e.g. €5M pre-money" value={s(form.valuation)} onChange={(e) => set('valuation', e.target.value)} /></Field>
					</>}

					{step === 2 && <>
						<Grid><Field label="Capital raised before this round"><Input type="number" min={0} value={s(form.prior_capital_raised)} onChange={(e) => set('prior_capital_raised', e.target.value)} /></Field><Field label="Last round date"><Input type="date" value={s(form.last_round_date)} onChange={(e) => set('last_round_date', e.target.value)} /></Field></Grid>
						<Grid><Field label="Current annual revenue / ARR"><Input type="number" min={0} value={s(form.annual_revenue)} onChange={(e) => set('annual_revenue', e.target.value)} /></Field><Field label="Monthly burn"><Input type="number" min={0} value={s(form.monthly_burn)} onChange={(e) => set('monthly_burn', e.target.value)} /></Field></Grid>
						<Grid><Field label="Revenue growth over the last 12 months (optional)"><Input type="number" placeholder="%" value={s(form.revenue_growth_pct)} onChange={(e) => set('revenue_growth_pct', e.target.value)} /></Field><Field label="Paying customers (optional)"><Input type="number" min={0} value={s(form.paying_customers)} onChange={(e) => set('paying_customers', e.target.value)} /></Field></Grid>
						<Field label="Months of runway remaining"><Input type="number" min={0} value={s(form.runway_months)} onChange={(e) => set('runway_months', e.target.value)} /></Field>
						<Field label="Strongest traction metric (optional)"><Input placeholder="e.g. 40% MoM growth" value={s(form.strongest_traction)} onChange={(e) => set('strongest_traction', e.target.value)} /></Field>
					</>}

					{step === 3 && <>
						<Grid>
							<Field label="Do you have a current pitch deck?"><Select placeholder="Select…" value={s(form.pitch_deck_status)} onChange={(e) => set('pitch_deck_status', e.target.value)} options={[['have', 'Yes — I’ll upload it'], ['later', 'I’ll add it later']]} /></Field>
							<Field label="Do you have an investor target list?"><Select value={form.has_target_list === true ? 'yes' : form.has_target_list === false ? 'no' : ''} onChange={(e) => set('has_target_list', e.target.value === 'yes')} placeholder="Select…" options={[['yes', 'Yes'], ['no', 'No']]} /></Field>
						</Grid>
						<Grid>
							<Field label="Do you have a financial model?"><Select placeholder="Select…" value={s(form.financial_model_status)} onChange={(e) => set('financial_model_status', e.target.value)} options={[['ready', 'Ready'], ['in_progress', 'In progress'], ['not_started', 'Not started']]} /></Field>
							<Field label="Do you have a data room?"><Select placeholder="Select…" value={s(form.data_room_status)} onChange={(e) => set('data_room_status', e.target.value)} options={[['ready', 'Ready'], ['in_progress', 'In progress'], ['not_started', 'Not started']]} /></Field>
						</Grid>
						<div style={{ fontSize: 13, color: 'var(--a-faint)', lineHeight: 1.5 }}>
							You’ll upload your deck and build out your investor pipeline from the workspace once setup is complete — the Pitch Deck and Pipeline pages walk you through it.
						</div>
					</>}

					{step === 4 && <>
						<Multi label="Which investor types are you targeting?" v={crit.investor_types} on={(x) => setC('investor_types', x)} opts={['VC', 'Angel', 'Family office', 'Strategic', 'CVC', 'Government fund']} />
						<Field label="Target geographies"><Input placeholder="Europe, UK" value={Array.isArray(crit.geographies) ? (crit.geographies as string[]).join(', ') : ''} onChange={(e) => setC('geographies', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} /></Field>
						<Grid><Field label="Cheque size — minimum"><Input type="number" min={0} value={s(crit.cheque_min)} onChange={(e) => setC('cheque_min', e.target.value)} /></Field><Field label="Cheque size — maximum"><Input type="number" min={0} value={s(crit.cheque_max)} onChange={(e) => setC('cheque_max', e.target.value)} /></Field></Grid>
						<Grid>
							<Field label="Lead, followers or both?"><Select placeholder="Select…" value={s(crit.lead_preference)} onChange={(e) => setC('lead_preference', e.target.value)} options={[['lead', 'Lead'], ['followers', 'Followers'], ['both', 'Both']]} /></Field>
							<Field label="Open to strategic investors?"><Select placeholder="Select…" value={crit.strategic_ok === true ? 'yes' : crit.strategic_ok === false ? 'no' : ''} onChange={(e) => setC('strategic_ok', e.target.value === 'yes')} options={[['yes', 'Yes'], ['no', 'No']]} /></Field>
						</Grid>
						<Multi label="What expertise or access would be most valuable? (optional)" v={crit.desired_expertise} on={(x) => setC('desired_expertise', x)} opts={['Commercial partnerships', 'Sports rights', 'Media', 'Product', 'International expansion', 'Other']} />
						<InvestorExclude label="Are there investors Atlas should exclude? (optional)" value={crit.excluded_investor_ids as string[] | undefined} onChange={(x) => setC('excluded_investor_ids', x)} />
						<Field label="Biggest fundraising concern (optional)"><Select placeholder="Select…" value={s(crit.biggest_concern)} onChange={(e) => setC('biggest_concern', e.target.value)} options={[['story', 'Story'], ['access', 'Investor access'], ['valuation', 'Valuation'], ['timing', 'Timing'], ['diligence', 'Due diligence'], ['other', 'Other']]} /></Field>
					</>}
				</div>
			</Card>

			<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
				<Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((x) => x - 1)}><ArrowLeft size={13} /> Back</Button>
				{step < STEPS.length - 1
					? <Button disabled={saving} onClick={() => void next()}>{saving ? <Loader2 className="spin" size={13} /> : <>Continue <ArrowRight size={13} /></>}</Button>
					: <Button disabled={saving} onClick={() => void finish()}>{saving ? <Loader2 className="spin" size={13} /> : <>Build my raise plan <Check size={13} /></>}</Button>}
			</div>
		</Screen>
	);
}

function TransitionScreen({ onEnter }: { onEnter: () => void }) {
	return (
		<div style={{ textAlign: 'center', padding: '32px 0' }}>
			<H1>Your raise workspace is ready.</H1>
			<Card variant="cream" style={{ margin: '24px 0', textAlign: 'left' }}>
				<div style={{ display: 'grid', gap: 12 }}>
					{['Round configured', 'Investor criteria defined', 'Initial matches identified', 'First actions generated'].map((t) => (
						<div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
							<span style={{ width: 20, height: 20, borderRadius: '50%', background: '#3B6D11', display: 'grid', placeItems: 'center' }}><Check size={13} color="#fff" /></span> {t}
						</div>
					))}
				</div>
			</Card>
			<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Here’s how Atlas Raise works</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24, textAlign: 'left' }}>
				{[['Prepare', 'Strengthen your pitch and get investor-ready.'], ['Connect', 'Find the right investors and organise your outreach.'], ['Close', 'Navigate due diligence, terms and closing.']].map(([t, d]) => (
					<Card key={t}><div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.5 }}>{d}</div></Card>
				))}
			</div>
			<Button onClick={onEnter}>Enter your fundraising workspace <ArrowRight size={13} /></Button>
		</div>
	);
}

/** Step 1 typeahead over /api/companies — pick to prefill + link an existing company. */
function CompanySearch({ onPick }: { onPick: (c: CoRow) => void }) {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const term = dq.trim();
	const res = useSWR<{ data: CoRow[] }>(term.length >= 2 ? qk.companies.list({ q: term, limit: 6 }) : null);
	const rows = res.data?.data ?? [];
	return (
		<Field label="Find your company">
			<div style={{ position: 'relative' }}>
				<Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--a-faint)', pointerEvents: 'none' }} />
				<Input placeholder="Search the Atlas database by name…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
				{term.length >= 2 && rows.length > 0 && (
					<div style={{ position: 'absolute', zIndex: 5, top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.10)' }}>
						{rows.map((c) => (
							<button key={c.id} type="button" onClick={() => { onPick(c); setQ(''); }}
								style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--a-border)', cursor: 'pointer', textAlign: 'left' }}>
								<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={26} radius={6} />
								<span style={{ minWidth: 0 }}><span style={{ fontSize: 13, color: 'var(--a-ink)' }}>{c.name}</span>{c.website && <span style={{ fontSize: 11, color: 'var(--a-faint)', marginLeft: 6 }}>{c.website.replace(/^https?:\/\//, '')}</span>}</span>
							</button>
						))}
					</div>
				)}
			</div>
			<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 6 }}>Find your company to prefill its details. Can’t find it? Just fill in the form below to add it as new.</div>
		</Field>
	);
}

function s(v: unknown): string { return v == null ? '' : String(v); }
function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>{children}</div>; }
function Multi({ label, v, on, opts }: { label: string; v: unknown; on: (x: string[]) => void; opts: string[] }) {
	const sel = new Set((v as string[]) ?? []);
	return <Field label={label}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
		{opts.map((o) => {
			const active = sel.has(o);
			return <button key={o} type="button" aria-pressed={active} className="atlas-btn atlas-btn--outline atlas-btn--sm" style={active ? { borderColor: 'var(--a-navy)', color: 'var(--a-navy)' } : undefined}
				onClick={() => { const nn = new Set(sel); nn.has(o) ? nn.delete(o) : nn.add(o); on([...nn]); }}>{o}</button>;
		})}
	</div></Field>;
}
