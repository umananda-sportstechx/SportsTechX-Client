'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Screen, H1, Card, Field, Input, Select, Button, Loading } from '@/components/atlas/kit';
import { InvestorExclude } from '@/components/atlas/investor-exclude';

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

	useEffect(() => {
		if (data?.raise) setForm(data.raise);
		if (data?.criteria) setCrit(data.criteria);
	}, [data]);

	const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
	const setC = (k: string, v: unknown) => setCrit((c) => ({ ...c, [k]: v }));

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

	const stepFields = useMemo<string[][]>(() => [
		['company_name', 'company_website', 'hq_country', 'hq_city', 'company_description', 'company_sector_id', 'company_category', 'company_stage', 'revenue_status'],
		['fundraising_process', 'round_type', 'target_amount', 'committed_amount', 'currency_code', 'target_close_date', 'lead_investor_status', 'structure', 'valuation'],
		['prior_capital_raised', 'last_round_date', 'annual_revenue', 'revenue_growth_pct', 'paying_customers', 'monthly_burn', 'runway_months', 'strongest_traction'],
		['pitch_deck_status', 'financial_model_status', 'data_room_status', 'has_target_list'],
	], []);

	const saveStep = async (i: number) => {
		const keys = stepFields[i] ?? [];
		const payload = Object.fromEntries(keys.filter((k) => form[k] !== undefined && form[k] !== '').map((k) => [k, form[k]]));
		if (Object.keys(payload).length === 0) return;
		await apiRequest('PATCH', '/api/raise', payload);
	};

	const next = async () => {
		setSaving(true);
		try { await saveStep(step); void mutate(); setStep((x) => Math.min(x + 1, STEPS.length - 1)); }
		catch (e) { toast.error((e as Error).message ?? 'Could not save'); }
		finally { setSaving(false); }
	};

	const finish = async () => {
		setSaving(true);
		try {
			const critPayload = Object.fromEntries(
				['investor_types', 'geographies', 'cheque_min', 'cheque_max', 'lead_preference', 'strategic_ok', 'desired_expertise', 'excluded_investor_ids', 'biggest_concern']
					.filter((k) => crit[k] !== undefined && crit[k] !== '').map((k) => [k, crit[k]]),
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
				<div style={{ display: 'grid', gap: 16 }}>
					{step === 0 && <>
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
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24, textAlign: 'left' }}>
				{[['Prepare', 'Strengthen your pitch and get investor-ready.'], ['Connect', 'Find the right investors and organise your outreach.'], ['Close', 'Navigate due diligence, terms and closing.']].map(([t, d]) => (
					<Card key={t}><div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.5 }}>{d}</div></Card>
				))}
			</div>
			<Button onClick={onEnter}>Enter your fundraising workspace <ArrowRight size={13} /></Button>
		</div>
	);
}

function s(v: unknown): string { return v == null ? '' : String(v); }
function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>; }
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
