'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Screen, H1, Sub, Card, Field, Input, Select, ReadOnly, Button, Loading } from '@/components/atlas/kit';

/**
 * Atlas Raise — Company & Raise settings (mock-up 16 / Notion "Company & Raise
 * Settings"). Edits the raise profile + investor criteria; the derived Current
 * stage is read-only. Saves via PATCH /api/raise and PUT /api/raise/criteria.
 */
type Rec = Record<string, unknown>;

export default function RaiseSettingsPage() {
	const { data, isLoading, mutate } = useSWR<{ raise: Rec | null; criteria: Rec | null }>(qk.raise.current());
	const home = useSWR<{ raise: { stage?: string | null } | null }>(qk.raise.home());
	const STAGE_LABEL: Record<string, string> = { setting_up: 'Setting up', preparing: 'Preparing', outreach: 'Outreach underway', in_conversations: 'In conversations', due_diligence: 'In due diligence', closing: 'Closing', funded: 'Funded', paused: 'Paused', closed: 'Closed' };
	const derivedStage = home.data?.raise?.stage ? (STAGE_LABEL[home.data.raise.stage] ?? home.data.raise.stage) : '—';
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

	// Atlas taxonomy picker — lets a founder set/correct the sector that drives Market + matching.
	const { data: sectors } = useSWR<Array<{ id: string; name: string; parent_id: string | null }>>(qk.reference.sectors());
	const sectorOptions = useMemo<[string, string][]>(() => {
		const list = sectors ?? [];
		const byId = new Map(list.map((x) => [x.id, x]));
		const path = (x: { name: string; parent_id: string | null }): string => {
			const parts = [x.name]; let p = x.parent_id;
			while (p) { const par = byId.get(p); if (!par) break; parts.unshift(par.name); p = par.parent_id; }
			return parts.join(' → ');
		};
		return list.filter((x) => !list.some((y) => y.parent_id === x.id)).map((x) => [x.id, path(x)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [sectors]);
	const pickSector = (id: string) => {
		set('company_sector_id', id || null);
		const label = sectorOptions.find(([v]) => v === id)?.[1];
		set('company_category', id && label ? label.split(' → ') : null);
	};

	const RAISE_KEYS = ['company_name', 'company_website', 'hq_city', 'hq_country', 'company_description',
		'company_sector_id', 'company_category', 'company_stage', 'revenue_status', 'round_type', 'target_amount', 'target_close_date', 'valuation',
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

	if (isLoading) return <Screen><Loading /></Screen>;

	return (
		<Screen>
			<H1>Raise settings</H1>
			<Sub>Edit the underlying information Atlas uses to run your raise.</Sub>

			<div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
				<Section title="Company profile">
					<Grid n={2}><Field label="Company name"><Input value={s(form.company_name)} onChange={(e) => set('company_name', e.target.value)} /></Field><Field label="Website"><Input value={s(form.company_website)} onChange={(e) => set('company_website', e.target.value)} /></Field></Grid>
					<Grid n={3}>
						<Field label="City"><Input value={s(form.hq_city)} onChange={(e) => set('hq_city', e.target.value)} /></Field>
						<Field label="Country"><Input value={s(form.hq_country)} onChange={(e) => set('hq_country', e.target.value)} /></Field>
						<Field label="Current stage"><Select placeholder="Select…" value={s(form.company_stage)} onChange={(e) => set('company_stage', e.target.value)} options={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['other', 'Other']]} /></Field>
					</Grid>
					<Field label="Company description"><Input value={s(form.company_description)} onChange={(e) => set('company_description', e.target.value)} /></Field>
					<Grid n={2}>
						<Field label="Category (Atlas taxonomy)"><Select placeholder="Select the closest category…" value={s(form.company_sector_id)} onChange={(e) => pickSector(e.target.value)} options={sectorOptions} /></Field>
						<Field label="Revenue status"><Select placeholder="Select…" value={s(form.revenue_status)} onChange={(e) => set('revenue_status', e.target.value)} options={[['pre_revenue', 'Pre-revenue'], ['generating', 'Generating revenue']]} /></Field>
					</Grid>
				</Section>

				<Section title="Raise details">
					<Grid n={3}>
						<Field label="Round type"><Select placeholder="Select…" value={s(form.round_type)} onChange={(e) => set('round_type', e.target.value)} options={[['pre_seed', 'Pre-seed'], ['seed', 'Seed'], ['series_a', 'Series A'], ['series_b_plus', 'Series B+'], ['bridge', 'Bridge'], ['other', 'Other']]} /></Field>
						<Field label="Target raise"><Input type="number" min={0} value={s(form.target_amount)} onChange={(e) => set('target_amount', e.target.value)} /></Field>
						<Field label="Target close date"><Input type="date" value={s(form.target_close_date)} onChange={(e) => set('target_close_date', e.target.value)} /></Field>
					</Grid>
					<Grid n={3}>
						<ReadOnly label="Amount committed" value={form.committed_amount != null ? String(form.committed_amount) : '—'} note="From your raise profile" />
						<Field label="Valuation"><Input placeholder="Not provided" value={s(form.valuation)} onChange={(e) => set('valuation', e.target.value)} /></Field>
						<Field label="Previous capital raised"><Input type="number" min={0} value={s(form.prior_capital_raised)} onChange={(e) => set('prior_capital_raised', e.target.value)} /></Field>
					</Grid>
					<Field label="Fundraising structure"><Select placeholder="Select…" value={s(form.structure)} onChange={(e) => set('structure', e.target.value)} options={[['equity', 'Priced equity round'], ['safe', 'SAFE'], ['convertible', 'Convertible'], ['undecided', 'Undecided'], ['other', 'Other']]} /></Field>
				</Section>

				<Section title="Investor criteria">
					<Grid n={2}>
						<Multi label="Investor types" v={crit.investor_types} on={(x) => setC('investor_types', x)} opts={['VC', 'Angel', 'Family office', 'Strategic', 'CVC', 'Government fund']} />
						<Field label="Geographies"><Input placeholder="Europe, UK" value={Array.isArray(crit.geographies) ? (crit.geographies as string[]).join(', ') : ''} onChange={(e) => setC('geographies', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} /></Field>
					</Grid>
					<Grid n={3}>
						<Field label="Cheque min"><Input type="number" min={0} value={s(crit.cheque_min)} onChange={(e) => setC('cheque_min', e.target.value)} /></Field>
						<Field label="Cheque max"><Input type="number" min={0} value={s(crit.cheque_max)} onChange={(e) => setC('cheque_max', e.target.value)} /></Field>
						<Field label="Lead or follower"><Select placeholder="Select…" value={s(crit.lead_preference)} onChange={(e) => setC('lead_preference', e.target.value)} options={[['lead', 'Prefer lead'], ['followers', 'Prefer followers'], ['both', 'Both']]} /></Field>
					</Grid>
					<Field label="Strategic investor preference"><Select value={crit.strategic_ok === true ? 'yes' : crit.strategic_ok === false ? 'no' : ''} onChange={(e) => setC('strategic_ok', e.target.value === 'yes')} options={[['yes', 'Open to strategics'], ['no', 'Financial investors only']]} placeholder="Select…" /></Field>
				</Section>

				<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
					<Button disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="spin" size={13} /> : 'Save changes'}</Button>
				</div>

				<Section title="Raise controls">
					<div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 12 }}>
						Current stage: <strong style={{ color: 'var(--a-muted)' }}>{derivedStage}</strong> · automatically determined from your pipeline activity, not editable here.
					</div>
					<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
						<Button variant="outline" disabled={busy} onClick={() => void setStatus('funded', 'Round marked as funded')}>Mark round as funded</Button>
						<Button variant="outline" disabled={busy} onClick={() => void setStatus('paused', 'Raise paused')}>Pause this raise</Button>
						<Button variant="danger" disabled={busy} onClick={() => void setStatus('closed', 'Raise closed')}>Close this raise</Button>
					</div>
				</Section>
			</div>
		</Screen>
	);
}

function s(v: unknown): string { return v == null ? '' : String(v); }
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return <Card style={{ padding: 22 }}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{title}</div><div style={{ display: 'grid', gap: 16 }}>{children}</div></Card>;
}
function Grid({ n, children }: { n: number; children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 16 }}>{children}</div>; }
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
