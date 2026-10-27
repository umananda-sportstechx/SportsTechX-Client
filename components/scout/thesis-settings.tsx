'use client';

import { Pencil, Sparkles } from 'lucide-react';
import { Button, Card, Loading, PageHead } from '@/components/atlas';
import { openScoutThesis } from '@/lib/setup-events';
import { useThesisState } from './use-thesis';
import type { Thesis } from './sample-data';
import { chequeRange } from './thesis-codec';

/**
 * Thesis settings — a READ-ONLY summary of the saved thesis, not a form.
 *
 * Editing happens in the same thesis wizard used for onboarding: the "Edit
 * thesis" button fires `openScoutThesis()`, which the globally-mounted
 * `SetupModalHost` turns into the pre-filled wizard modal (it reads the saved
 * thesis as its initial state and resumes on the Review step when everything is
 * already filled). On save the wizard mutates the scout/thesis SWR keys, so this
 * summary — built from the same `useThesisState()` — refreshes on its own.
 *
 * There is deliberately no inline form here any more: one editor (the wizard),
 * one place to change the thesis, no second set of inputs to drift from it.
 */
export function ThesisSettings() {
	const { thesis: t, isLoading, needsSetup } = useThesisState();
	if (isLoading) return <Loading />;

	const cheque = chequeRange(t);
	const hq = [t.city, t.country].filter(Boolean).join(', ');

	return (
		<>
			<PageHead
				title="Thesis settings"
				sub="What Atlas uses to personalise your recommendations, signals and Deal Flow."
				actions={<Button onClick={() => openScoutThesis({ edit: true })}><Pencil size={13} /> Edit thesis</Button>}
			/>

			{needsSetup ? (
				<Card>
					<div style={{ textAlign: 'center', padding: '28px 16px', display: 'grid', gap: 12, placeItems: 'center' }}>
						<span style={{ width: 44, height: 44, borderRadius: 'var(--a-radius-sm)', display: 'grid', placeItems: 'center', background: 'var(--a-inset)', color: 'var(--a-muted)' }}><Sparkles size={20} /></span>
						<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)' }}>Your thesis isn&rsquo;t set up yet</div>
						<p style={{ margin: 0, maxWidth: 440, fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>
							Tell Atlas what you&rsquo;re looking for — stage, cheque, geography and sectors — and it personalises the whole product to your thesis.
						</p>
						<Button onClick={() => openScoutThesis()} style={{ marginTop: 4 }}>Set up your thesis</Button>
					</div>
				</Card>
			) : (
				<div className="scout-stack">
					<SummaryCard title="Profile" fields={[
						['Name', t.name], ['Work email', t.email], ['Role', t.role], ['LinkedIn', t.linkedin],
					]} />
					<SummaryCard title="Fund" fields={[
						['Fund / organisation', t.fundName], ['Investor type', t.investorType],
						['Fund size / AUM', t.aum], ['Website', t.website], ['Headquarters', hq],
					]} />
					<SummaryCard title="Stage &amp; cheque" fields={[
						['Stages', t.stages], ['Cheque size', cheque], ['Lead or follow', t.invStyle],
					]} />
					<SummaryCard title="Investment focus" fields={[
						['Regions', t.regions], ['Sectors', t.sectors], ['Minimum traction', t.traction],
						['Looks for', t.include], ['Avoids', t.exclude],
					]} />
				</div>
			)}
		</>
	);
}

type FieldValue = Thesis[keyof Thesis];

function SummaryCard({ title, fields }: { title: string; fields: [string, FieldValue][] }) {
	return (
		<Card>
			<div style={{ paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--a-border)', fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)' }}>
				{title}
			</div>
			<dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: '18px 28px', margin: 0 }}>
				{fields.map(([label, value]) => (
					<div key={label} style={{ minWidth: 0 }}>
						<dt style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--a-muted)', marginBottom: 7 }}>{label}</dt>
						<dd style={{ margin: 0 }}><FieldReadout value={value} /></dd>
					</div>
				))}
			</dl>
		</Card>
	);
}

function FieldReadout({ value }: { value: FieldValue }) {
	if (Array.isArray(value)) {
		if (value.length === 0) return <Dash />;
		return (
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{value.map((v) => (
					<span key={v} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, lineHeight: 1.3, padding: '4px 10px', borderRadius: 'var(--a-radius-pill)', background: 'var(--a-inset)', border: '1px solid var(--a-border)', color: 'var(--a-ink)' }}>{v}</span>
				))}
			</div>
		);
	}
	const text = value == null ? '' : String(value).trim();
	if (!text) return <Dash />;
	return <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--a-ink)', wordBreak: 'break-word' }}>{text}</span>;
}

function Dash() {
	return <span style={{ fontSize: 13.5, color: 'var(--a-faint)' }}>—</span>;
}
