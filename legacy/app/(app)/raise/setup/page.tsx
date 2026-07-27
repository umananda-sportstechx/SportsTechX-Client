'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * Atlas Raise — first-login setup wizard (Notion: "Raise Setup Questionnaire").
 * Progressive auto-save: each step PATCHes /api/raise; the final step PUTs the
 * investor criteria and flips setup_completed → transition screen.
 *
 * Lives in the founder persona workspace under (app); no separate shell.
 */

type Raise = Record<string, unknown>;
type Criteria = Record<string, unknown>;

const STEPS = ['Company', 'Your raise', 'History & traction', 'What’s ready', 'Investors'] as const;

export default function RaiseSetupPage() {
	const router = useRouter();
	const { data, isLoading, mutate } = useSWR<{ raise: Raise | null; criteria: Criteria | null }>(qk.raise.current());
	const [step, setStep] = useState(0);
	const [saving, setSaving] = useState(false);
	const [done, setDone] = useState(false);
	const [form, setForm] = useState<Record<string, unknown>>({});
	const [crit, setCrit] = useState<Record<string, unknown>>({});

	// Seed local state from any saved draft once it loads.
	useEffect(() => {
		if (data?.raise) setForm(data.raise);
		if (data?.criteria) setCrit(data.criteria);
	}, [data]);

	const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
	const setC = (k: string, v: unknown) => setCrit((c) => ({ ...c, [k]: v }));

	// Fields owned by each step — only these are sent on that step's save.
	const stepFields = useMemo<string[][]>(() => [
		['company_name', 'company_website', 'hq_country', 'hq_city', 'company_description', 'company_stage', 'revenue_status'],
		['round_type', 'target_amount', 'committed_amount', 'currency_code', 'target_close_date', 'lead_investor_status', 'structure', 'valuation'],
		['prior_capital_raised', 'last_round_date', 'annual_revenue', 'monthly_burn', 'runway_months', 'strongest_traction'],
		[], // "what's ready" is captured as pipeline seed later; no raise columns in v1
	], []);

	const saveStep = async (i: number) => {
		const keys = stepFields[i] ?? [];
		const payload = Object.fromEntries(keys.filter((k) => form[k] !== undefined && form[k] !== '').map((k) => [k, form[k]]));
		if (Object.keys(payload).length === 0) return;
		await apiRequest('PATCH', '/api/raise', payload);
	};

	const next = async () => {
		setSaving(true);
		try { await saveStep(step); void mutate(); setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
		catch (e) { toast.error((e as Error).message ?? 'Could not save'); }
		finally { setSaving(false); }
	};

	const finish = async () => {
		setSaving(true);
		try {
			const critPayload = Object.fromEntries(
				['investor_types', 'geographies', 'cheque_min', 'cheque_max', 'lead_preference', 'strategic_ok', 'desired_expertise', 'biggest_concern']
					.filter((k) => crit[k] !== undefined && crit[k] !== '').map((k) => [k, crit[k]]),
			);
			await apiRequest('PUT', '/api/raise/criteria', critPayload);
			await apiRequest('PATCH', '/api/raise', { setup_completed: true });
			setDone(true);
		} catch (e) { toast.error((e as Error).message ?? 'Could not build your plan'); }
		finally { setSaving(false); }
	};

	if (isLoading) return <Page><Center><Loader2 className="spin" size={22} /></Center></Page>;
	if (done) return <Page><TransitionScreen onEnter={() => router.push('/raise')} /></Page>;

	return (
		<Page>
			<div style={{ maxWidth: 720, margin: '0 auto' }}>
				{/* progress */}
				<div style={{ marginBottom: 28 }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
						Set up your raise · Step {step + 1} of {STEPS.length}
					</div>
					<div style={{ display: 'flex', gap: 6 }}>
						{STEPS.map((_, i) => (
							<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--bg-2)' }} />
						))}
					</div>
					<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', margin: '18px 0 6px' }}>{STEPS[step]}</h1>
				</div>

				<div style={{ display: 'grid', gap: 16 }}>
					{step === 0 && <>
						<Text label="Company name" v={form.company_name} on={(x) => set('company_name', x)} />
						<Text label="Website" v={form.company_website} on={(x) => set('company_website', x)} placeholder="https://" />
						<Row><Text label="Country" v={form.hq_country} on={(x) => set('hq_country', x)} /><Text label="City" v={form.hq_city} on={(x) => set('hq_city', x)} /></Row>
						<Text label="What does the company do?" v={form.company_description} on={(x) => set('company_description', x)} placeholder="One sentence" />
						<Row>
							<Select label="Stage" v={form.company_stage} on={(x) => set('company_stage', x)} opts={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['other', 'Other']]} />
							<Select label="Generating revenue?" v={form.revenue_status} on={(x) => set('revenue_status', x)} opts={[['pre_revenue', 'Pre-revenue'], ['generating', 'Yes']]} />
						</Row>
					</>}

					{step === 1 && <>
						<Select label="What round are you raising?" v={form.round_type} on={(x) => set('round_type', x)} opts={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['bridge', 'Bridge'], ['other', 'Other']]} />
						<Row>
							<Num label="How much are you raising?" v={form.target_amount} on={(x) => set('target_amount', x)} />
							<Num label="Already committed" v={form.committed_amount} on={(x) => set('committed_amount', x)} />
						</Row>
						<Row>
							<Select label="Currency" v={form.currency_code ?? 'EUR'} on={(x) => set('currency_code', x)} opts={[['EUR', 'EUR'], ['USD', 'USD'], ['GBP', 'GBP']]} />
							<Text label="Target close date" v={form.target_close_date} on={(x) => set('target_close_date', x)} type="date" />
						</Row>
						<Row>
							<Select label="Lead investor?" v={form.lead_investor_status} on={(x) => set('lead_investor_status', x)} opts={[['yes', 'Yes'], ['no', 'No'], ['in_discussion', 'In discussion']]} />
							<Select label="Structure" v={form.structure} on={(x) => set('structure', x)} opts={[['equity', 'Equity'], ['safe', 'SAFE'], ['convertible', 'Convertible'], ['undecided', 'Undecided'], ['other', 'Other']]} />
						</Row>
						<Text label="Target valuation (optional)" v={form.valuation} on={(x) => set('valuation', x)} placeholder="e.g. €5M pre-money" />
					</>}

					{step === 2 && <>
						<Row>
							<Num label="Capital raised before this round" v={form.prior_capital_raised} on={(x) => set('prior_capital_raised', x)} />
							<Text label="Last round date" v={form.last_round_date} on={(x) => set('last_round_date', x)} type="date" />
						</Row>
						<Row>
							<Num label="Current annual revenue / ARR" v={form.annual_revenue} on={(x) => set('annual_revenue', x)} />
							<Num label="Monthly burn" v={form.monthly_burn} on={(x) => set('monthly_burn', x)} />
						</Row>
						<Num label="Months of runway remaining" v={form.runway_months} on={(x) => set('runway_months', x)} />
						<Text label="Strongest traction metric (optional)" v={form.strongest_traction} on={(x) => set('strongest_traction', x)} placeholder="e.g. 40% MoM growth" />
					</>}

					{step === 3 && <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6, padding: '4px 0' }}>
						You’ll add your pitch deck and existing investor conversations from the workspace once setup is complete — the Pitch Deck and Pipeline pages walk you through it. Continue to define the investors you need.
					</div>}

					{step === 4 && <>
						<Multi label="Which investor types are you targeting?" v={crit.investor_types} on={(x) => setC('investor_types', x)} opts={['VC', 'Angel', 'Family office', 'Strategic', 'CVC', 'Government fund']} />
						<Row>
							<Num label="Cheque size — minimum" v={crit.cheque_min} on={(x) => setC('cheque_min', x)} />
							<Num label="Cheque size — maximum" v={crit.cheque_max} on={(x) => setC('cheque_max', x)} />
						</Row>
						<Row>
							<Select label="Lead, followers or both?" v={crit.lead_preference} on={(x) => setC('lead_preference', x)} opts={[['lead', 'Lead'], ['followers', 'Followers'], ['both', 'Both']]} />
							<Select label="Open to strategic investors?" v={crit.strategic_ok === true ? 'yes' : crit.strategic_ok === false ? 'no' : ''} on={(x) => setC('strategic_ok', x === 'yes')} opts={[['yes', 'Yes'], ['no', 'No']]} />
						</Row>
						<Select label="Biggest fundraising concern (optional)" v={crit.biggest_concern} on={(x) => setC('biggest_concern', x)} opts={[['story', 'Story'], ['access', 'Investor access'], ['valuation', 'Valuation'], ['timing', 'Timing'], ['diligence', 'Due diligence'], ['other', 'Other']]} />
					</>}
				</div>

				<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
					<button className="btn ghost" disabled={step === 0 || saving} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={13} /> Back</button>
					{step < STEPS.length - 1
						? <button className="btn" disabled={saving} onClick={() => void next()}>{saving ? <Loader2 className="spin" size={13} /> : <>Continue <ArrowRight size={13} /></>}</button>
						: <button className="btn" disabled={saving} onClick={() => void finish()}>{saving ? <Loader2 className="spin" size={13} /> : <>Build my raise plan <Check size={13} /></>}</button>}
				</div>
			</div>
		</Page>
	);
}

// ── Transition screen (Notion: "Your raise workspace is ready") ──────────────
function TransitionScreen({ onEnter }: { onEnter: () => void }) {
	return (
		<div style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center' }}>
			<div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}><Check size={28} /></div>
			<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px' }}>Your raise workspace is ready.</h1>
			<div style={{ display: 'grid', gap: 8, textAlign: 'left', margin: '24px auto', maxWidth: 340 }}>
				{['Round configured', 'Investor criteria defined', 'Initial matches identified', 'First actions generated'].map((t) => (
					<div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Check size={15} color="var(--accent)" /> {t}</div>
				))}
			</div>
			<button className="btn" onClick={onEnter}>Enter your fundraising workspace <ArrowRight size={13} /></button>
		</div>
	);
}

// ── Small field helpers (self-contained, CSS-var styled) ─────────────────────
function Center({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>{children}</div>; }
function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>; }
function Label({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>{children}</div>; }
const inputStyle: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 14, fontFamily: 'inherit' };

function Text({ label, v, on, placeholder, type = 'text' }: { label: string; v: unknown; on: (x: string) => void; placeholder?: string; type?: string }) {
	return <div><Label>{label}</Label><input type={type} style={inputStyle} placeholder={placeholder} value={(v as string) ?? ''} onChange={(e) => on(e.target.value)} /></div>;
}
function Num({ label, v, on }: { label: string; v: unknown; on: (x: number | '') => void }) {
	return <div><Label>{label}</Label><input type="number" min={0} style={inputStyle} value={(v as number) ?? ''} onChange={(e) => on(e.target.value === '' ? '' : Number(e.target.value))} /></div>;
}
function Select({ label, v, on, opts }: { label: string; v: unknown; on: (x: string) => void; opts: [string, string][] }) {
	return <div><Label>{label}</Label><select style={inputStyle} value={(v as string) ?? ''} onChange={(e) => on(e.target.value)}>
		<option value="">Select…</option>{opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
	</select></div>;
}
function Multi({ label, v, on, opts }: { label: string; v: unknown; on: (x: string[]) => void; opts: string[] }) {
	const sel = new Set((v as string[]) ?? []);
	return <div><Label>{label}</Label><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
		{opts.map((o) => {
			const active = sel.has(o);
			return <button key={o} type="button" className={`btn ghost ${active ? 'active' : ''}`} style={active ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
				onClick={() => { const n = new Set(sel); n.has(o) ? n.delete(o) : n.add(o); on([...n]); }}>{o}</button>;
		})}
	</div></div>;
}
