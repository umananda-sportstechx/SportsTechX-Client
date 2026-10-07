'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpLeft, Check } from 'lucide-react';
import { Action, Button, Card, Field, Input, PlaceholderTag, Textarea, cx } from '@/components/atlas';
import { ChipSet, toggleIn } from './thesis-fields';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import type { SampleDeal } from './sample-data';
import { hrefOf } from '@/lib/routes';

/**
 * From the Circle → Share a deal (Claude Design "Add deal"): company, round,
 * your involvement, review, then "Submitted for eligibility check".
 * Backend Not Connected: submissions are kept in this browser as pending deals.
 */
interface Draft {
	company: string; website: string; hq: string; sector: string; desc: string; founder: string;
	round: string; instrument: string; currency: string; target: string; committed: string; valuation: string; close: string; leadStatus: string; lead: string;
	notes: string; relation: string[]; myCommit: string; deckLink: string; access: string; consent: boolean;
}
const BLANK: Draft = {
	company: '', website: '', hq: '', sector: '', desc: '', founder: '',
	round: 'Seed', instrument: 'Priced Equity', currency: 'EUR', target: '', committed: '', valuation: '', close: '', leadStatus: 'Lead confirmed', lead: '',
	notes: '', relation: ['Investing in this round'], myCommit: '', deckLink: '', access: 'Circle members', consent: false,
};
const STEPS = [
	{ name: 'Company', title: 'About the company', sub: 'The company raising and what it does.' },
	{ name: 'Round', title: 'Round details', sub: 'Terms as currently agreed with the company.' },
	{ name: 'Your involvement', title: 'Your involvement and materials', sub: 'Helps Circle members understand how you are connected to the deal.' },
	{ name: 'Review', title: 'Review and submit', sub: 'Check the details before sending for an eligibility check.' },
];

export function ShareDeal() {
	const [, setShared] = usePlaceholderState<SampleDeal[]>('shared-deals', []);
	const [step, setStep] = useState(0);
	const [d, setD] = useState<Draft>(BLANK);
	const [err, setErr] = useState('');
	const [done, setDone] = useState(false);
	const patch = (p: Partial<Draft>) => { setD({ ...d, ...p }); setErr(''); };
	const txt = (k: keyof Draft) => ({ value: String(d[k]), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => patch({ [k]: e.target.value } as Partial<Draft>) });
	const sym = d.currency === 'USD' ? '$' : '€';

	const missing = step === 0 ? (!d.company.trim() || !d.desc.trim() ? 'Please complete the required fields: Company name, Short description.' : '')
		: step === 1 ? (!d.target.trim() ? 'Please complete the required fields: Target raise.' : '')
			: step === 2 ? (!d.consent ? 'Please confirm founder consent before continuing.' : '') : '';
	const next = () => {
		if (missing) { setErr(missing); return; }
		if (step < 3) { setStep(step + 1); window.scrollTo(0, 0); return; }
		const deal: SampleDeal = {
			id: `shared-${Date.now()}`, kind: 'circle', name: d.company.trim(), hq: d.hq || '—', sector: d.sector || '—', desc: d.desc.trim(),
			round: d.round, target: d.target, committed: d.committed || '—', pct: 0, valuation: d.valuation || 'Not disclosed', instrument: d.instrument,
			close: d.close || '—', lead: d.leadStatus, summary: d.notes || 'Shared by you. Pending eligibility check.', fit: false, by: 'you', pending: true,
		};
		setShared((prev) => [deal, ...prev]);
		setDone(true); window.scrollTo(0, 0);
	};

	if (done) return (
		<>
			<Card className="scout-section scout-done">
				<span className="scout-tag scout-tag--ok"><Check size={11} /> Submitted for eligibility check</span>
				<h2 className="atlas-h2">{d.company || 'Your deal'} has been submitted.</h2>
				<p className="scout-body">SportsTechX will review eligibility, usually within two working days. We’ll email you once it’s live in From the Circle, or if we need anything else.</p>
				<div className="scout-intro__actions">
					<Button href={hrefOf('deal-flow-circle')} variant="outline">Back to From the Circle</Button>
					<Button onClick={() => { setD(BLANK); setStep(0); setDone(false); }}>Share another deal</Button>
				</div>
			</Card>
		</>
	);

	const s = STEPS[step];
	return (
		<>
			<Action icon={<ArrowUpLeft />} href={hrefOf('deal-flow-circle')}>From the Circle</Action>
			<div className="scout-subhead scout-subhead--page">
				<div><h1 className="atlas-h1">Share a deal with the Circle<PlaceholderTag /></h1><p className="scout-muted">Share an opportunity with Investor Circle members. SportsTechX checks eligibility before it’s published.</p></div>
			</div>
			<Steps names={STEPS.map((x) => x.name)} step={step} onPick={(i) => i < step && setStep(i)} />
			<Card className="scout-section">
				<div className="scout-section__head"><h2 className="atlas-h2">{s.title}</h2><p className="scout-muted">{s.sub}</p></div>
				{step === 0 && (
					<div className="scout-form-grid">
						<Field label="Company name"><Input {...txt('company')} placeholder="e.g. Goalbound" /></Field>
						<Field label="Website · Optional"><Input {...txt('website')} placeholder="e.g. goalbound.io" /></Field>
						<Field label="Headquarters"><Input {...txt('hq')} placeholder="City, country" /></Field>
						<Field label="Sector"><Input {...txt('sector')} placeholder="e.g. Fan Engagement" /></Field>
						<div className="scout-span"><Field label="Short description"><Textarea rows={3} {...txt('desc')} placeholder="One or two sentences on what the company does and who it serves." /></Field></div>
						<Field label="Founder contact email"><Input type="email" {...txt('founder')} placeholder="founder@company.com" /></Field>
					</div>
				)}
				{step === 1 && (
					<>
						<Block label="Round"><ChipSet options={['Pre-seed', 'Seed', 'Series A', 'Series B', 'Bridge / extension']} value={d.round} onToggle={(o) => patch({ round: o })} /></Block>
						<Block label="Instrument"><ChipSet options={['Priced Equity', 'SAFE', 'Convertible Note', 'ASA', 'Other']} value={d.instrument} onToggle={(o) => patch({ instrument: o })} /></Block>
						<Block label="Currency"><ChipSet options={['EUR', 'USD']} value={d.currency} onToggle={(o) => patch({ currency: o })} /></Block>
						<div className="scout-form-grid">
							<Field label="Target raise"><Input {...txt('target')} placeholder={`e.g. ${sym}1.5m`} /></Field>
							<Field label="Committed to date"><Input {...txt('committed')} placeholder={`e.g. ${sym}500k`} /></Field>
							<Field label="Valuation / cap · Optional"><Input {...txt('valuation')} placeholder={`e.g. ${sym}8m pre-money`} /></Field>
							<Field label="Target close date"><Input type="date" {...txt('close')} /></Field>
						</div>
						<Block label="Lead status"><ChipSet options={['Lead confirmed', 'Seeking lead', 'No lead required']} value={d.leadStatus} onToggle={(o) => patch({ leadStatus: o })} /></Block>
						{d.leadStatus === 'Lead confirmed' && <div className="scout-form-grid"><Field label="Lead investor"><Input {...txt('lead')} placeholder="Fund or angel name" /></Field></div>}
					</>
				)}
				{step === 2 && (
					<>
						<Field label="Note for Circle members"><Textarea rows={3} {...txt('notes')} placeholder="What do you like about the company? Anything investors should know? What are they looking for?" /></Field>
						<Block label="Your relationship to the deal"><ChipSet options={['Investing in this round', 'Existing investor', 'Advisor / board', 'Referral only']} value={d.relation} onToggle={(o) => patch({ relation: toggleIn(d.relation, o) })} /></Block>
						<div className="scout-form-grid">
							<Field label="Your commitment · Optional"><Input {...txt('myCommit')} placeholder={`e.g. ${sym}100k`} /></Field>
							<Field label="Pitch deck link · Optional"><Input {...txt('deckLink')} placeholder="DocSend, Google Drive, Notion…" /></Field>
						</div>
						<Block label="Who can access these documents?"><ChipSet options={['Circle members', 'Only after intro request']} value={d.access} onToggle={(o) => patch({ access: o })} /></Block>
						<button type="button" className={cx('scout-consent', d.consent && 'on')} aria-pressed={d.consent} onClick={() => patch({ consent: !d.consent })}>
							<span className="scout-pick__box" aria-hidden="true">{d.consent && <Check size={11} />}</span>
							The founder has agreed to this opportunity being shared with Investor Circle members.
						</button>
					</>
				)}
				{step === 3 && (
					<div className="scout-review">
						{([
							['Company', 0, [['Company', d.company], ['Website', d.website], ['Headquarters', d.hq], ['Sector', d.sector], ['Description', d.desc]]],
							['Round', 1, [['Round', d.round], ['Instrument', d.instrument], ['Target', d.target], ['Committed', d.committed], ['Valuation', d.valuation], ['Close', d.close], ['Lead', d.leadStatus === 'Lead confirmed' ? d.lead || d.leadStatus : d.leadStatus]]],
							['Your involvement', 2, [['Note', d.notes], ['Relationship', d.relation.join(', ')], ['Your commitment', d.myCommit], ['Documents', d.access]]],
						] as [string, number, [string, string][]][]).map(([name, i, rows]) => (
							<div key={name} className="scout-review__group">
								<div className="scout-review__head"><span className="atlas-eyebrow">{name}</span><button type="button" className="scout-link" onClick={() => setStep(i)}>Edit</button></div>
								{rows.map(([k, v]) => <div key={k} className="scout-review__row"><span>{k}</span><span className={v ? undefined : 'scout-muted'}>{v || '—'}</span></div>)}
							</div>
						))}
						<p className="scout-muted">Deals shared by Circle members are checked for eligibility by SportsTechX but are not independently selected or endorsed. By submitting you confirm the information is accurate and the founder has agreed to it being shared.</p>
					</div>
				)}
				{err && <p className="scout-error" role="alert">{err}</p>}
				<div className="scout-intro__actions">
					{step === 0 ? <Link href={hrefOf('deal-flow-circle')} className="atlas-btn atlas-btn--outline">Cancel</Link> : <Button variant="outline" onClick={() => setStep(step - 1)}>← Back</Button>}
					<Button onClick={next}>{step === 3 ? 'Submit deal' : 'Continue'}</Button>
				</div>
			</Card>
		</>
	);
}

/** Numbered step bar (Share a deal, onboarding). */
export function Steps({ names, step, onPick }: { names: string[]; step: number; onPick?: (i: number) => void }) {
	return (
		<ol className="scout-steps">
			{names.map((n, i) => (
				<li key={n} className={cx(i <= step && 'done', i === step && 'current')}>
					<button type="button" onClick={() => onPick?.(i)} disabled={i >= step}><span className="scout-steps__bar" />{i + 1}. {n}</button>
				</li>
			))}
		</ol>
	);
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
	return <div className="scout-field"><div className="scout-field__label">{label}</div>{children}</div>;
}
