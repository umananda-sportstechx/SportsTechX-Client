'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { refreshRaise } from '@/lib/invalidate';
import { openRaiseSetup } from '@/lib/setup-events';
import { Screen, PageHead, Card, Button, Loading } from '@/components/atlas';
import { AccountTabs } from '@/components/features/account/account-tabs';
import { DealflowOptIn } from '@/components/raise/dealflow-opt-in';

/**
 * Atlas Raise — Company & Raise settings. A READ-ONLY summary of the raise
 * profile + investor criteria; editing happens in the same Raise setup wizard
 * used for onboarding ("Edit raise" → `openRaiseSetup({ edit: true })`, which the
 * globally-mounted SetupModalHost opens pre-filled and closes on save). No inline
 * form — one editor, one source of truth.
 *
 * The operational sections below the summary (Investor Circle opt-in, and the
 * raise controls that mark a round funded/paused/closed) are NOT part of the
 * setup wizard, so they stay here as live controls.
 */
type Rec = Record<string, unknown>;

const STAGE_LABEL: Record<string, string> = { setting_up: 'Setting up', preparing: 'Preparing', outreach: 'Outreach underway', in_conversations: 'In conversations', due_diligence: 'In due diligence', closing: 'Closing', funded: 'Funded', paused: 'Paused', closed: 'Closed' };
const ROUND: Record<string, string> = { pre_seed: 'Pre-seed', seed: 'Seed', series_a: 'Series A', series_b_plus: 'Series B+', bridge: 'Bridge', other: 'Other' };
const REVENUE: Record<string, string> = { pre_revenue: 'Pre-revenue', generating: 'Generating revenue' };
const STRUCTURE: Record<string, string> = { equity: 'Priced equity round', safe: 'SAFE', convertible: 'Convertible', undecided: 'Undecided', other: 'Other' };
const LEAD: Record<string, string> = { lead: 'Prefer lead', followers: 'Prefer followers', both: 'Both' };

const s = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): string => {
	if (v == null || v === '') return '';
	const n = Number(v);
	return Number.isFinite(n) ? n.toLocaleString() : String(v);
};
const map = (m: Record<string, string>, v: unknown): string => (v == null || v === '' ? '' : m[String(v)] ?? String(v));

export default function RaiseSettingsPage() {
	const { data, isLoading, mutate } = useSWR<{ raise: Rec | null; criteria: Rec | null }>(qk.raise.current());
	const home = useSWR<{ raise: { stage?: string | null } | null }>(qk.raise.home());
	const [busy, setBusy] = useState(false);

	const setStatus = async (status: string, label: string) => {
		setBusy(true);
		try { await apiRequest('PATCH', '/api/raise', { status }); void mutate(); void refreshRaise(); toast.success(label); }
		catch (e) { toast.error((e as Error).message ?? 'Could not update'); }
		finally { setBusy(false); }
	};

	if (isLoading) return <Screen><Loading /></Screen>;

	const r = data?.raise ?? {};
	const c = data?.criteria ?? {};
	const needsSetup = !data?.raise;
	const cur = s(r.currency_code) || 'EUR';
	const category = Array.isArray(r.company_category) ? (r.company_category as string[]).join(' → ') : s(r.company_category);
	const hq = [s(r.hq_city), s(r.hq_country)].filter(Boolean).join(', ');
	const cheque = r_has(c.cheque_min) || r_has(c.cheque_max) ? `${num(c.cheque_min) || '—'} – ${num(c.cheque_max) || '—'} ${cur}` : '';
	const strategic = c.strategic_ok === true ? 'Open to strategics' : c.strategic_ok === false ? 'Financial investors only' : '';
	const excluded = Array.isArray(c.excluded_investor_ids) && c.excluded_investor_ids.length ? `${c.excluded_investor_ids.length} excluded` : '';
	const derivedStage = home.data?.raise?.stage ? (STAGE_LABEL[home.data.raise.stage] ?? home.data.raise.stage) : '—';

	return (
		<Screen>
			<PageHead
				title="Raise settings"
				sub="The underlying information Atlas uses to run your raise."
				actions={!needsSetup && <Button onClick={() => openRaiseSetup({ edit: true })}><Pencil size={13} /> Edit raise</Button>}
			/>
			<AccountTabs />

			<div style={{ display: 'grid', gap: 18 }}>
				{needsSetup ? (
					<Card>
						<div style={{ textAlign: 'center', padding: '28px 16px', display: 'grid', gap: 12, placeItems: 'center' }}>
							<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)' }}>Your raise isn&rsquo;t set up yet</div>
							<p style={{ margin: 0, maxWidth: 440, fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>
								Tell Atlas about your company, your round and the investors you want, and it builds your raise plan, pipeline and matches.
							</p>
							<Button onClick={() => openRaiseSetup()} style={{ marginTop: 4 }}>Set up your raise</Button>
						</div>
					</Card>
				) : (
					<>
						<SummaryCard title="Company profile" fields={[
							['Company name', s(r.company_name)], ['Website', s(r.company_website)],
							['Headquarters', hq], ['Stage', map(ROUND, r.company_stage)],
							['Revenue status', map(REVENUE, r.revenue_status)], ['Category', category],
							['Description', s(r.company_description)],
						]} />
						<SummaryCard title="Raise details" fields={[
							['Round type', map(ROUND, r.round_type)], ['Target raise', num(r.target_amount) ? `${num(r.target_amount)} ${cur}` : ''],
							['Target close date', s(r.target_close_date)], ['Committed', num(r.committed_amount) ? `${num(r.committed_amount)} ${cur}` : ''],
							['Valuation', num(r.valuation) ? `${num(r.valuation)} ${cur}` : ''], ['Prior capital raised', num(r.prior_capital_raised) ? `${num(r.prior_capital_raised)} ${cur}` : ''],
							['Structure', map(STRUCTURE, r.structure)],
						]} />
						<SummaryCard title="Investor criteria" fields={[
							['Investor types', (c.investor_types as string[]) ?? []], ['Geographies', (c.geographies as string[]) ?? []],
							['Cheque size', cheque], ['Lead or follower', map(LEAD, c.lead_preference)],
							['Strategic preference', strategic], ['Excluded investors', excluded],
						]} />
					</>
				)}

				{/* Operational — not part of the setup wizard, so they stay as live controls. */}
				<Section title="Investor Circle">
					<DealflowOptIn />
				</Section>

				{!needsSetup && (
					<Section title="Raise controls">
						<div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--a-muted)', marginBottom: 4 }}>
							Current stage: <strong style={{ fontFamily: 'var(--a-mono)', fontWeight: 400, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-ink)' }}>{derivedStage}</strong> · automatically determined from your pipeline activity, not editable here.
						</div>
						<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
							<Button variant="outline" disabled={busy} onClick={() => void setStatus('funded', 'Round marked as funded')}>Mark round as funded</Button>
							<Button variant="outline" disabled={busy} onClick={() => void setStatus('paused', 'Raise paused')}>Pause this raise</Button>
							<Button variant="danger" disabled={busy} onClick={() => void setStatus('closed', 'Raise closed')}>Close this raise</Button>
						</div>
					</Section>
				)}
			</div>
		</Screen>
	);
}

function r_has(v: unknown): boolean { return v != null && v !== ''; }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<Card>
			<div style={{ fontSize: 16, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)', paddingBottom: 14, marginBottom: 18, borderBottom: '1px solid var(--a-border)' }}>{title}</div>
			<div style={{ display: 'grid', gap: 16 }}>{children}</div>
		</Card>
	);
}

function SummaryCard({ title, fields }: { title: string; fields: [string, string | string[]][] }) {
	return (
		<Card>
			<div style={{ paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--a-border)', fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)' }}>{title}</div>
			<dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '18px 28px', margin: 0 }}>
				{fields.map(([label, value]) => (
					<div key={label} style={{ minWidth: 0 }}>
						<dt style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--a-muted)', marginBottom: 7 }}>{label}</dt>
						<dd style={{ margin: 0 }}><Readout value={value} /></dd>
					</div>
				))}
			</dl>
		</Card>
	);
}

function Readout({ value }: { value: string | string[] }) {
	if (Array.isArray(value)) {
		if (value.length === 0) return <Dash />;
		return (
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{value.map((v) => <span key={v} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, lineHeight: 1.3, padding: '4px 10px', borderRadius: 'var(--a-radius-pill)', background: 'var(--a-inset)', border: '1px solid var(--a-border)', color: 'var(--a-ink)' }}>{v}</span>)}
			</div>
		);
	}
	const text = value.trim();
	if (!text) return <Dash />;
	return <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--a-ink)', wordBreak: 'break-word' }}>{text}</span>;
}

function Dash() { return <span style={{ fontSize: 13.5, color: 'var(--a-faint)' }}>—</span>; }
