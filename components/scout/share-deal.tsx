'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowUpLeft, Check, Loader2, Paperclip, ShieldCheck, X } from 'lucide-react';
import { Action, Button, Card, Empty, Field, Input, Loading, Select, Textarea, cx } from '@/components/atlas';
import { ChipSet } from './thesis-fields';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';

/**
 * From the Circle → Share a deal: company, round, your involvement, review,
 * then "Submitted for eligibility check".
 *
 * The form always collected most of this and then threw it away — it built a
 * sample deal and pushed it into `localStorage`. It now posts a real draft and
 * submits it for review, which is what makes `founder_consent` matter: a
 * database constraint refuses to publish a deal without it.
 *
 * Three mismatches the sample data hid, now handled:
 *   - **Sector** was free text; the column is a `sector_id`, so this is a real
 *     picker over the taxonomy (leaf sectors only, which is where companies
 *     actually sit).
 *   - **Amounts** were free text like `€1.5m`; the columns are numeric with a
 *     separate `currency_code`.
 *   - **Relationship** was multi-select; the column holds one value.
 *
 * Anonymity is deliberately not asked. Both flags default to *named* at the
 * column level, which matches the design, and an omitted key can never widen
 * access. `materials_access` is asked, because the design asks it.
 */
interface Draft {
	company: string; website: string; hq: string; sectorId: string; desc: string;
	founderName: string; founderEmail: string; founderPhone: string;
	round: string; instrument: string; currency: string;
	target: string; committed: string; valuation: string; close: string;
	leadStatus: string; lead: string;
	notes: string; relation: string; myCommit: string; access: string; consent: boolean;
	/** `bucket/key`, set once the file is in storage. Not a URL — the column rejects those. */
	deckPath: string; onePagerPath: string;
}
const BLANK: Draft = {
	company: '', website: '', hq: '', sectorId: '', desc: '',
	founderName: '', founderEmail: '', founderPhone: '',
	round: 'Seed', instrument: 'Priced Equity', currency: 'EUR',
	target: '', committed: '', valuation: '', close: '',
	leadStatus: 'Lead confirmed', lead: '',
	notes: '', relation: 'Investing in this round', myCommit: '', access: 'Only after intro request', consent: false,
	deckPath: '', onePagerPath: '',
};

const STEPS = [
	{ name: 'Company', title: 'About the company', sub: 'The company raising and what it does.' },
	{ name: 'Round', title: 'Round details', sub: 'Terms as currently agreed with the company.' },
	{ name: 'Your involvement', title: 'Your involvement and materials', sub: 'Helps Circle members understand how you are connected to the deal.' },
	{ name: 'Review', title: 'Review and submit', sub: 'Check the details before sending for an eligibility check.' },
];

// Design labels → the API's enums.
const INSTRUMENT: Record<string, string> = {
	'Priced Equity': 'priced_equity', SAFE: 'safe', 'Convertible Note': 'convertible_note',
	ASA: 'asa', Other: 'other',
};
const LEAD: Record<string, string> = {
	'Lead confirmed': 'confirmed', 'Seeking lead': 'seeking', 'No lead required': 'not_required',
};
const RELATION: Record<string, string> = {
	'Investing in this round': 'investing_this_round', 'Existing investor': 'existing_investor',
	'Advisor / board': 'advisor_or_board', 'Referral only': 'referral',
};
const ACCESS: Record<string, string> = {
	'Circle members': 'immediate', 'Only after intro request': 'on_request',
};

/** A typed amount → a number the API will accept, or null. */
const num = (v: string): number | null => {
	const n = Number(String(v).replace(/[^0-9.]/g, ''));
	return Number.isFinite(n) && n > 0 ? n : null;
};

export function ShareDeal() {
	// Eligibility is a read now, so nobody fills four steps and fails on submit.
	const gate = useSWR<{ can_submit: boolean }>(qk.scout.canSubmit());
	const { data: sectors } = useSWR<Array<{ id: string; name: string; parent_id: string | null }>>(qk.reference.sectors());

	const [step, setStep] = useState(0);
	const [d, setD] = useState<Draft>(BLANK);
	const [err, setErr] = useState('');
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState(false);
	// Set once a draft exists server-side, so a retry updates it instead of
	// creating another.
	const [draftId, setDraftId] = useState<string | null>(null);

	const patch = (p: Partial<Draft>) => { setD((prev) => ({ ...prev, ...p })); setErr(''); };
	const txt = (k: keyof Draft) => ({
		value: String(d[k]),
		onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => patch({ [k]: e.target.value } as Partial<Draft>),
	});
	const sym = d.currency === 'USD' ? '$' : '€';

	// Leaf sectors only, shown as `Parent → Child`. Same builder as Raise setup.
	const sectorOptions = useMemo<[string, string][]>(() => {
		const list = sectors ?? [];
		const byId = new Map(list.map((s) => [s.id, s]));
		const path = (s: { name: string; parent_id: string | null }): string => {
			const parts = [s.name]; let p = s.parent_id;
			while (p) { const par = byId.get(p); if (!par) break; parts.unshift(par.name); p = par.parent_id; }
			return parts.join(' → ');
		};
		const isLeaf = (id: string) => !list.some((x) => x.parent_id === id);
		return list.filter((s) => isLeaf(s.id)).map((s) => [s.id, path(s)] as [string, string])
			.sort((a, b) => a[1].localeCompare(b[1]));
	}, [sectors]);

	const needsThesis = (gate.error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';
	if (gate.isLoading) return <Loading />;
	if (needsThesis) {
		return (
			<Empty>
				Set up your investment thesis first.{' '}
				<Link href={hrefOf('thesis')} style={{ color: 'var(--a-accent)' }}>Set up your thesis</Link>
			</Empty>
		);
	}
	// Sharing needs a verified investor profile. Say so up front rather than at
	// the end of a four-step form.
	if (gate.data && !gate.data.can_submit) {
		return (
			<Card className="scout-section">
				<span className="scout-tag"><ShieldCheck size={11} /> Verification required</span>
				<h2 className="atlas-h2">Sharing a deal needs a verified investor profile</h2>
				<p className="scout-body">
					Circle members can share opportunities once SportsTechX has verified their fund or
					investment profile. Get verified and we&rsquo;ll open this up.
				</p>
				<div className="scout-intro__actions">
					<Button href={hrefOf('deal-flow-circle')} variant="outline">Back to From the Circle</Button>
					<Button href={hrefOf('verify')}>Get verified</Button>
				</div>
			</Card>
		);
	}

	const missing = step === 0
		? (!d.company.trim() || !d.desc.trim() ? 'Please complete the required fields: Company name, Short description.' : '')
		: step === 1 ? (!num(d.target) ? 'Please enter a target raise as a number.' : '')
			: step === 2 ? (!d.consent ? 'Please confirm founder consent before continuing.' : '') : '';

	const submit = async () => {
		setBusy(true);
		try {
			// Create the draft, then submit it. Only the submit step flips it to
			// `pending` for review — a draft on its own is invisible to everyone.
			//
			// Two calls means a failure can land between them, so the created id is
			// remembered: a retry PATCHes the draft it already made and submits that,
			// rather than creating a second row every time someone presses the button
			// again. Both routes take the identical payload, so this is the same body.
			const payload = {
				company_name: d.company.trim(),
				company_website: d.website.trim() || null,
				company_hq: d.hq.trim() || null,
				company_description: d.desc.trim(),
				sector_id: d.sectorId || null,
				founder_contact_name: d.founderName.trim() || null,
				founder_contact_email: d.founderEmail.trim() || null,
				founder_contact_phone: d.founderPhone.trim() || null,
				round_type: d.round,
				instrument: INSTRUMENT[d.instrument] ?? 'other',
				currency_code: d.currency,
				target_amount: num(d.target),
				committed_amount: num(d.committed),
				// `valuation` is a text column on purpose — "€8m pre-money" is not a
				// number and squeezing it into one would lose the qualifier.
				valuation: d.valuation.trim() || null,
				target_close_date: d.close || null,
				lead_status: LEAD[d.leadStatus] ?? null,
				lead_investor: d.leadStatus === 'Lead confirmed' ? (d.lead.trim() || null) : null,
				member_relationship: RELATION[d.relation] ?? null,
				member_commitment: num(d.myCommit),
				member_perspective: d.notes.trim() || null,
				deck_path: d.deckPath || null,
				one_pager_path: d.onePagerPath || null,
				materials_access: ACCESS[d.access] ?? 'on_request',
				founder_consent: d.consent,
			};
			const res = draftId
				? await apiRequest('PATCH', `/api/scout/dealflow/${draftId}`, payload)
				: await apiRequest('POST', '/api/scout/dealflow', payload);
			if (!res.ok) throw new Error(String(res.status));
			const { id } = (await res.json()) as { id: string };
			setDraftId(id);

			const sent = await apiRequest('POST', `/api/scout/dealflow/${id}/submit`);
			if (!sent.ok) throw new Error(String(sent.status));
			setDone(true); window.scrollTo(0, 0);
		} catch {
			setErr('We couldn’t submit that. Please check the details and try again.');
		} finally { setBusy(false); }
	};

	const next = () => {
		if (missing) { setErr(missing); return; }
		if (step < 3) { setStep(step + 1); window.scrollTo(0, 0); return; }
		void submit();
	};

	if (done) return (
		<Card className="scout-section scout-done">
			<span className="scout-tag scout-tag--ok"><Check size={11} /> Submitted for eligibility check</span>
			<h2 className="atlas-h2">{d.company || 'Your deal'} has been submitted.</h2>
			<p className="scout-body">SportsTechX will review eligibility, usually within two working days. We&rsquo;ll email you once it&rsquo;s live in From the Circle, or if we need anything else.</p>
			<div className="scout-intro__actions">
				<Button href={hrefOf('deal-flow-circle')} variant="outline">Back to From the Circle</Button>
				<Button onClick={() => { setD(BLANK); setStep(0); setDone(false); setDraftId(null); }}>Share another deal</Button>
			</div>
		</Card>
	);

	const s = STEPS[step];
	return (
		<>
			<Action icon={<ArrowUpLeft />} href={hrefOf('deal-flow-circle')}>From the Circle</Action>
			<div className="scout-subhead scout-subhead--page">
				<div>
					<h1 className="atlas-h1">Share a deal with the Circle</h1>
					<p className="scout-muted">Share an opportunity with Investor Circle members. SportsTechX checks eligibility before it&rsquo;s published.</p>
				</div>
			</div>
			<Steps names={STEPS.map((x) => x.name)} step={step} onPick={(i) => i < step && setStep(i)} />
			<Card className="scout-section">
				<div className="scout-section__head"><h2 className="atlas-h2">{s.title}</h2><p className="scout-muted">{s.sub}</p></div>
				{step === 0 && (
					<div className="scout-form-grid">
						<Field label="Company name"><Input {...txt('company')} placeholder="e.g. Goalbound" /></Field>
						<Field label="Website · Optional"><Input {...txt('website')} placeholder="e.g. goalbound.io" /></Field>
						<Field label="Headquarters"><Input {...txt('hq')} placeholder="City, country" /></Field>
						<Field label="Sector">
							<Select
								value={d.sectorId} onChange={(e) => patch({ sectorId: e.target.value })}
								options={sectorOptions} placeholder="Select a sector…"
							/>
						</Field>
						<div className="scout-span">
							<Field label="Short description"><Textarea rows={3} {...txt('desc')} placeholder="One or two sentences on what the company does and who it serves." /></Field>
						</div>
						{/* STX-only, and the reason an admin opens the row at all — it is
						    never returned to another Scout. */}
						<Field label="Founder contact name · Optional"><Input {...txt('founderName')} placeholder="Who should we contact?" /></Field>
						<Field label="Founder contact email"><Input type="email" {...txt('founderEmail')} placeholder="founder@company.com" /></Field>
						<Field label="Founder contact phone · Optional"><Input {...txt('founderPhone')} placeholder="Optional" /></Field>
					</div>
				)}
				{step === 1 && (
					<>
						<Block label="Round"><ChipSet options={['Pre-seed', 'Seed', 'Series A', 'Series B', 'Bridge / extension']} value={d.round} onToggle={(o) => patch({ round: o })} /></Block>
						<Block label="Instrument"><ChipSet options={['Priced Equity', 'SAFE', 'Convertible Note', 'ASA', 'Other']} value={d.instrument} onToggle={(o) => patch({ instrument: o })} /></Block>
						<Block label="Currency"><ChipSet options={['EUR', 'USD']} value={d.currency} onToggle={(o) => patch({ currency: o })} /></Block>
						<div className="scout-form-grid">
							{/* Numeric now: the columns are numeric with the currency held
							    separately, so "€1.5m" cannot be stored. */}
							<Field label={`Target raise (${sym})`}><Input type="number" min="0" {...txt('target')} placeholder="1500000" /></Field>
							<Field label={`Committed to date (${sym}) · Optional`}><Input type="number" min="0" {...txt('committed')} placeholder="500000" /></Field>
							<Field label="Valuation / cap · Optional"><Input {...txt('valuation')} placeholder={`e.g. ${sym}8m pre-money`} /></Field>
							<Field label="Target close date · Optional"><Input type="date" {...txt('close')} /></Field>
						</div>
						<Block label="Lead status"><ChipSet options={['Lead confirmed', 'Seeking lead', 'No lead required']} value={d.leadStatus} onToggle={(o) => patch({ leadStatus: o })} /></Block>
						{d.leadStatus === 'Lead confirmed' && (
							<div className="scout-form-grid"><Field label="Lead investor"><Input {...txt('lead')} placeholder="Fund or angel name" /></Field></div>
						)}
					</>
				)}
				{step === 2 && (
					<>
						<Field label="Note for Circle members"><Textarea rows={3} {...txt('notes')} placeholder="What do you like about the company? Anything investors should know? What are they looking for?" /></Field>
						{/* Single-select: the column holds one relationship. */}
						<Block label="Your relationship to the deal"><ChipSet options={['Investing in this round', 'Existing investor', 'Advisor / board', 'Referral only']} value={d.relation} onToggle={(o) => patch({ relation: o })} /></Block>
						<div className="scout-form-grid">
							<Field label={`Your commitment (${sym}) · Optional`}><Input type="number" min="0" {...txt('myCommit')} placeholder="100000" /></Field>
						</div>
						<div className="scout-form-grid">
							<DocField
								label="Pitch deck · Optional" path={d.deckPath}
								onPath={(p) => patch({ deckPath: p })}
							/>
							<DocField
								label="One-pager · Optional" path={d.onePagerPath}
								onPath={(p) => patch({ onePagerPath: p })}
							/>
						</div>
						<Block label="Who can access the company's materials?"><ChipSet options={['Circle members', 'Only after intro request']} value={d.access} onToggle={(o) => patch({ access: o })} /></Block>
						<p className="scout-muted" style={{ fontSize: 12 }}>
							Members never get the file itself — they get a short-lived link, and only once
							they&rsquo;re allowed it. An anonymous listing always requires an introduction
							first, whatever you choose above, because a deck names the company on every page.
						</p>
						<button type="button" className={cx('scout-consent', d.consent && 'on')} aria-pressed={d.consent} onClick={() => patch({ consent: !d.consent })}>
							<span className="scout-pick__box" aria-hidden="true">{d.consent && <Check size={11} />}</span>
							The founder has agreed to this opportunity being shared with Investor Circle members.
						</button>
					</>
				)}
				{step === 3 && (
					<div className="scout-review">
						{([
							['Company', 0, [['Company', d.company], ['Website', d.website], ['Headquarters', d.hq], ['Sector', sectorOptions.find(([v]) => v === d.sectorId)?.[1] ?? ''], ['Description', d.desc], ['Founder contact', [d.founderName, d.founderEmail, d.founderPhone].filter(Boolean).join(' · ')]]],
							['Round', 1, [['Round', d.round], ['Instrument', d.instrument], ['Target', d.target && `${sym}${d.target}`], ['Committed', d.committed && `${sym}${d.committed}`], ['Valuation', d.valuation], ['Close', d.close], ['Lead', d.leadStatus === 'Lead confirmed' ? d.lead || d.leadStatus : d.leadStatus]]],
							['Your involvement', 2, [['Note', d.notes], ['Relationship', d.relation], ['Your commitment', d.myCommit && `${sym}${d.myCommit}`], ['Materials', d.access], ['Attached', [d.deckPath && 'pitch deck', d.onePagerPath && 'one-pager'].filter(Boolean).join(', ')]]],
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
					{step === 0
						? <Link href={hrefOf('deal-flow-circle')} className="atlas-btn atlas-btn--outline">Cancel</Link>
						: <Button variant="outline" onClick={() => setStep(step - 1)}>← Back</Button>}
					<Button disabled={busy} onClick={next}>{busy ? 'Submitting…' : step === 3 ? 'Submit deal' : 'Continue'}</Button>
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

const BUCKET = 'user-uploads';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'ppt', 'pptx', 'doc', 'docx'];

/**
 * One document, uploaded straight to storage.
 *
 * Same route the pitch-deck analyser already uses
 * (`features/deck-analysis/deck-summary.tsx`): the browser uploads with the
 * user's own session under their own uid prefix, then the API is given the
 * `bucket/key` string. No server endpoint is involved, which is why
 * `deck_path` explicitly **rejects anything that looks like a URL** — storing a
 * link would bypass the signed-URL scheme the whole release gate depends on.
 *
 * The file is uploaded before the deal row exists. That is fine: the path does
 * not reference the deal, and an abandoned wizard leaves an orphan object
 * rather than a half-made listing.
 */
function DocField({ label, path, onPath }: {
	label: string;
	path: string;
	onPath: (p: string) => void;
}) {
	const [busy, setBusy] = useState(false);
	const ref = useRef<HTMLInputElement | null>(null);

	const pick = async (file: File) => {
		const ext = (file.name.split('.').pop() ?? '').toLowerCase();
		if (!ALLOWED_EXT.includes(ext)) { toast.error('Upload a PDF, PPT/PPTX or DOC/DOCX.'); return; }
		if (file.size > MAX_BYTES) { toast.error('File too large (max 25 MB).'); return; }
		setBusy(true);
		try {
			const supabase = getSupabaseBrowser();
			const { data: auth } = await supabase.auth.getUser();
			const uid = auth.user?.id;
			if (!uid) throw new Error('Not signed in');
			const key = `${uid}/deals/${crypto.randomUUID()}.${ext}`;
			const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
				upsert: false, contentType: file.type || 'application/octet-stream',
			});
			if (error) throw error;
			// `bucket/key` — the server splits on the first slash to sign it.
			onPath(`${BUCKET}/${key}`);
			toast.success('Uploaded');
		} catch (e) {
			toast.error((e as Error).message ?? 'Upload failed');
		} finally { setBusy(false); }
	};

	return (
		<Field label={label}>
			{path ? (
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
					<Paperclip size={13} aria-hidden="true" />
					<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
						{path.split('/').pop()}
					</span>
					<button type="button" className="scout-link" onClick={() => onPath('')} aria-label={`Remove ${label}`}>
						<X size={12} /> Remove
					</button>
				</div>
			) : (
				<>
					<input
						ref={ref} type="file" hidden accept=".pdf,.ppt,.pptx,.doc,.docx"
						onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }}
					/>
					<Button variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
						{busy ? <><Loader2 className="animate-spin" size={13} /> Uploading…</> : 'Choose a file'}
					</Button>
				</>
			)}
		</Field>
	);
}
