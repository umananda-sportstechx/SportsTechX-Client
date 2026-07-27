'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * Atlas Raise — Company & Raise settings (Notion "Company & Raise Settings",
 * mock-up 16). Edits the underlying raise profile + investor criteria Atlas uses
 * to run the raise; the derived Current stage is not editable here. Saves via the
 * existing PATCH /api/raise and PUT /api/raise/criteria.
 */

type Rec = Record<string, unknown>;

export default function RaiseSettingsPage() {
	const { data, isLoading, mutate } = useSWR<{ raise: Rec | null; criteria: Rec | null }>(qk.raise.current());
	const [form, setForm] = useState<Rec>({});
	const [crit, setCrit] = useState<Rec>({});
	const [saving, setSaving] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (data?.raise) setForm(data.raise);
		if (data?.criteria) setCrit(data.criteria);
	}, [data]);

	const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
	const setC = (k: string, v: unknown) => setCrit((c) => ({ ...c, [k]: v }));

	const RAISE_KEYS = ['company_name', 'company_website', 'hq_city', 'hq_country', 'company_description',
		'company_stage', 'revenue_status', 'round_type', 'target_amount', 'target_close_date', 'valuation',
		'prior_capital_raised', 'structure'];
	const CRIT_KEYS = ['investor_types', 'geographies', 'cheque_min', 'cheque_max', 'lead_preference', 'strategic_ok'];

	const save = async () => {
		setSaving(true);
		try {
			const rp = Object.fromEntries(RAISE_KEYS.filter((k) => form[k] !== undefined && form[k] !== '').map((k) => [k, form[k]]));
			const cp = Object.fromEntries(CRIT_KEYS.filter((k) => crit[k] !== undefined && crit[k] !== '').map((k) => [k, crit[k]]));
			await apiRequest('PATCH', '/api/raise', rp);
			await apiRequest('PUT', '/api/raise/criteria', cp);
			void mutate();
			toast.success('Settings saved');
		} catch (e) { toast.error((e as Error).message ?? 'Could not save'); }
		finally { setSaving(false); }
	};

	const setStatus = async (status: string, label: string) => {
		setBusy(true);
		try { await apiRequest('PATCH', '/api/raise', { status }); void mutate(); toast.success(label); }
		catch (e) { toast.error((e as Error).message ?? 'Could not update'); }
		finally { setBusy(false); }
	};

	if (isLoading) return <Page><Center><Loader2 className="spin" size={22} /></Center></Page>;

	return (
		<Page>
			<div style={{ maxWidth: 1120 }}>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Raise settings</h1>
				<p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 24px' }}>Edit the underlying information Atlas uses to run your raise.</p>

				<Section title="Company profile">
					<Row><Text label="Company name" v={form.company_name} on={(x) => set('company_name', x)} /><Text label="Website" v={form.company_website} on={(x) => set('company_website', x)} /></Row>
					<Row>
						<Row><Text label="City" v={form.hq_city} on={(x) => set('hq_city', x)} /><Text label="Country" v={form.hq_country} on={(x) => set('hq_country', x)} /></Row>
						<Select label="Current stage" v={form.company_stage} on={(x) => set('company_stage', x)} opts={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['other', 'Other']]} />
					</Row>
					<Text label="Company description" v={form.company_description} on={(x) => set('company_description', x)} />
					<Select label="Revenue status" v={form.revenue_status} on={(x) => set('revenue_status', x)} opts={[['pre_revenue', 'Pre-revenue'], ['generating', 'Generating revenue']]} />
				</Section>

				<Section title="Raise details">
					<Row>
						<Select label="Round type" v={form.round_type} on={(x) => set('round_type', x)} opts={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['bridge', 'Bridge'], ['other', 'Other']]} />
						<Num label="Target raise" v={form.target_amount} on={(x) => set('target_amount', x)} />
						<Text label="Target close date" v={form.target_close_date} on={(x) => set('target_close_date', x)} type="date" />
					</Row>
					<Row>
						<ReadOnly label="Amount committed" value={form.committed_amount != null ? String(form.committed_amount) : '—'} note="Calculated from committed investors in your pipeline" />
						<Text label="Valuation" v={form.valuation} on={(x) => set('valuation', x)} placeholder="Not provided" />
						<Num label="Previous capital raised" v={form.prior_capital_raised} on={(x) => set('prior_capital_raised', x)} />
					</Row>
					<Select label="Fundraising structure" v={form.structure} on={(x) => set('structure', x)} opts={[['equity', 'Priced equity round'], ['safe', 'SAFE'], ['convertible', 'Convertible'], ['undecided', 'Undecided'], ['other', 'Other']]} />
				</Section>

				<Section title="Investor criteria">
					<Row>
						<Multi label="Investor types" v={crit.investor_types} on={(x) => setC('investor_types', x)} opts={['VC', 'Angel', 'Family office', 'Strategic', 'CVC', 'Government fund']} />
						<CsvText label="Geographies" v={crit.geographies} on={(x) => setC('geographies', x)} placeholder="Europe, UK" />
					</Row>
					<Row>
						<Row><Num label="Cheque min" v={crit.cheque_min} on={(x) => setC('cheque_min', x)} /><Num label="Cheque max" v={crit.cheque_max} on={(x) => setC('cheque_max', x)} /></Row>
						<Select label="Lead or follower preference" v={crit.lead_preference} on={(x) => setC('lead_preference', x)} opts={[['lead', 'Prefer lead'], ['followers', 'Prefer followers'], ['both', 'Both']]} />
					</Row>
					<Select label="Strategic investor preference" v={crit.strategic_ok === true ? 'yes' : crit.strategic_ok === false ? 'no' : ''} on={(x) => setC('strategic_ok', x === 'yes')} opts={[['yes', 'Open to strategics'], ['no', 'Financial investors only']]} />
				</Section>

				<div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0 32px' }}>
					<button className="btn" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="spin" size={13} /> : 'Save changes'}</button>
				</div>

				<Section title="Raise controls">
					<p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 12px' }}>
						Current stage: <strong style={{ color: 'var(--fg-2)' }}>{String(form.stage ?? '—')}</strong> · automatically determined from your pipeline activity, not editable here.
					</p>
					<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
						<button className="btn ghost" disabled={busy} onClick={() => void setStatus('funded', 'Round marked as funded')}>Mark round as funded</button>
						<button className="btn ghost" disabled={busy} onClick={() => void setStatus('paused', 'Raise paused')}>Pause this raise</button>
						<button className="btn ghost" disabled={busy} style={{ borderColor: '#E24B4A', color: '#A32D2D' }} onClick={() => void setStatus('closed', 'Raise closed')}>Close this raise</button>
					</div>
				</Section>
			</div>
		</Page>
	);
}

// ── helpers ──────────────────────────────────────────────────────────────────
function Center({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>{children}</div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="card" style={{ padding: 22, marginBottom: 18 }}>
			<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{title}</div>
			<div style={{ display: 'grid', gap: 16 }}>{children}</div>
		</div>
	);
}
function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${(children as unknown[])?.length ?? 2}, 1fr)`, gap: 16 }}>{children}</div>; }
function Label({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 6 }}>{children}</div>; }
const inputStyle: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', background: 'var(--bg-1)', border: '1px solid var(--border-strong)', borderRadius: 6, color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit' };

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
function CsvText({ label, v, on, placeholder }: { label: string; v: unknown; on: (x: string[]) => void; placeholder?: string }) {
	const str = Array.isArray(v) ? (v as string[]).join(', ') : '';
	return <div><Label>{label}</Label><input style={inputStyle} placeholder={placeholder} value={str}
		onChange={(e) => on(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></div>;
}
function ReadOnly({ label, value, note }: { label: string; value: string; note?: string }) {
	return <div><Label>{label}</Label>
		<div style={{ ...inputStyle, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', color: 'var(--fg-2)' }}>{value}</div>
		{note && <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>{note}</div>}
	</div>;
}
function Multi({ label, v, on, opts }: { label: string; v: unknown; on: (x: string[]) => void; opts: string[] }) {
	const sel = new Set((v as string[]) ?? []);
	return <div><Label>{label}</Label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
		{opts.map((o) => {
			const active = sel.has(o);
			return <button key={o} type="button" className="btn ghost" style={active ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
				onClick={() => { const n = new Set(sel); n.has(o) ? n.delete(o) : n.add(o); on([...n]); }}>{o}</button>;
		})}
	</div></div>;
}
