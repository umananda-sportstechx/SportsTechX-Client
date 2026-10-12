'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { AtlasLogo, Button, Card, H1, Loading, Screen } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ProfileFields, FundFields, StageFields, GeographyFields, SectorFields, AttributeFields } from './thesis-form';
import { useThesisState, type ThesisState } from './use-thesis';
import { VerifyButton } from '@/components/features/verify/verify-cta';
import { useSetupScrollReset } from '@/components/setup/setup-modal';
import { SCOUT_COLOR } from './shell-config';
import type { Thesis } from './sample-data';
// `scout.css` is imported by AppShell, which this route deliberately does NOT
// render — the onboarding group has no shell chrome. Without this import every
// `scout-*` rule is missing here, which is not a styling nit: `ChipSet` falls
// back to native grey buttons and `PickerDialog` loses `position: fixed`, so
// the “+ Add” picker renders inline in the page instead of as an overlay.
import './scout.css';

/**
 * Investor onboarding: Profile → Fund → Stage & cheque → Investment focus →
 * Review, then the transition screen.
 *
 * Built to the same idiom as the Raise setup wizard
 * (`app/(dashboard)/setup/page.tsx`): a `Screen` at 720, an `atlas-pagehead`
 * carrying the step bar, one `Card` holding the step body, and a ghost/primary
 * nav row below it. The two are the same moment in two different products and
 * used to look nothing alike.
 *
 * The thesis is persisted to the account (`PATCH /api/scout` +
 * `PUT /api/scout/thesis`, via `useThesis`) and the last step stamps
 * `setup_completed_at` — which is what `GET /scout/recommended` requires, and
 * what clears the “complete your thesis” card on Home.
 */
const STEPS: { name: string; title: string; sub: string }[] = [
	{ name: 'Profile', title: 'Tell us about you', sub: 'This is how you’ll appear to the SportsTechX team. We use it to verify your profile.' },
	{ name: 'Fund', title: 'Your fund', sub: 'Helps us verify your profile and match you with raises of the right size.' },
	{ name: 'Stage & cheque', title: 'Stage and cheque size', sub: 'Where you invest and how much you typically write.' },
	{ name: 'Investment focus', title: 'Investment focus', sub: 'Where you invest, what you invest in, and what you avoid. Atlas uses this to rank companies, signals and Deal Flow for you.' },
	{ name: 'Review', title: 'Review your thesis', sub: 'Check everything before you finish. You can change your thesis at any time.' },
];
const required = (t: Thesis, step: number) => [
	() => (t.name.trim() && t.email.includes('@') ? '' : 'Add your full name and a valid work email.'),
	() => (t.fundName.trim() && t.investorType ? '' : 'Add your fund or organisation name and investor type.'),
	() => (t.stages.length ? '' : 'Select at least one stage.'),
	() => (!t.regions.length ? 'Select at least one region.' : !t.sectors.length ? 'Select at least one sector.' : ''),
	() => '',
][step]();

/**
 * The step to open on. With per-step saving, a returning Scout whose first three
 * steps are already stored should land on the first one still missing something
 * rather than retyping their fund name. All complete → the Review step.
 */
function firstIncomplete(t: Thesis): number {
	for (let i = 0; i < STEPS.length; i++) if (required(t, i)) return i;
	return STEPS.length - 1;
}

export function Onboarding({ onClose }: { onClose: () => void }) {
	const { isLoading: profileLoading } = useUserProfile();
	const { thesis: saved, save, isLoading } = useThesisState();
	// Wait for the THESIS, not just the profile.
	//
	// This used to gate on `useUserProfile().isLoading` alone while reading the
	// thesis through `useThesis()`, which throws its own loading state away. The
	// profile usually resolves first, so the form mounted seeded with
	// DEFAULT_THESIS, `useState` kept that seed, and a returning Scout who
	// reopened the wizard could save an empty thesis over a real one.
	if (profileLoading || isLoading) return <Frame><Screen width={720}><Loading /></Screen></Frame>;
	return <OnboardingForm initial={saved} save={save} onClose={onClose} />;
}

function OnboardingForm({ initial, save, onClose }: { initial: Thesis; save: ThesisState['save']; onClose: () => void }) {
	const [t, setT] = useState<Thesis>(initial);
	// Resume where they left off. Every step saves as it is left, so a thesis
	// that already satisfies steps 1–3 should not make anyone retype them —
	// mirrors the Raise wizard's resume scan in app/(dashboard)/setup/page.tsx.
	const [step, setStep] = useState(() => firstIncomplete(initial));
	const [err, setErr] = useState('');
	const [done, setDone] = useState(false);
	// Above the `if (done)` early return below: a hook after it is a conditional
	// hook, and React throws "rendered fewer hooks than expected" the moment the
	// wizard finishes and that branch renders.
	const [busy, setBusy] = useState(false);
	const patch = (p: Partial<Thesis>) => { setT({ ...t, ...p }); setErr(''); };
	// Scrolls the modal's own region; a no-op anywhere else.
	const top = useSetupScrollReset();

	if (done) return <Frame width={620}><Screen width={620}><DoneScreen name={t.name} onEnter={onClose} /></Screen></Frame>;

	const s = STEPS[step];
	const last = step === STEPS.length - 1;
	const next = async () => {
		const e = required(t, step);
		// Two channels, as the Raise wizard does it: the banner is what you read,
		// the toast is what you notice when the banner has scrolled out of view.
		if (e) { setErr(e); toast.error(e); return; }
		setBusy(true);
		try {
			// Every step persists as it is left. This wizard used to write nothing
			// until the final step, which was survivable while it was a page you
			// had to deliberately navigate away from — as a modal, one Escape key
			// would have thrown away five minutes of typing.
			//
			// Only the final step stamps. `setup_completed_at` is a one-way
			// COALESCE server-side, so marking setup finished on step 1 could
			// never be undone — and it is what lifts the 403 on the rest of Scout.
			// Advancing the screen before the stamp lands would leave the user
			// looking at a finished wizard on a still-gated Scout.
			await save(t, { complete: last });
			if (!last) { setStep(step + 1); top(); return; }
			setDone(true);
			top();
		} catch {
			const m = 'Could not save your thesis. Check your connection and try again.';
			setErr(m);
			toast.error(m);
		} finally { setBusy(false); }
	};

	return (
		<Frame>
			<Screen width={720}>
				<header className="atlas-pagehead">
					<div className="atlas-eyebrow" style={{ marginBottom: 14 }}>
						Set up your thesis · Step {step + 1} of {STEPS.length}
					</div>
					<StepBar step={step} onPick={(i) => { setStep(i); setErr(''); top(); }} />
					<H1>{s.title}</H1>
					<p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)', maxWidth: 560 }}>{s.sub}</p>
				</header>

				<Card style={{ padding: 23 }}>
					{err && (
						<div role="alert" style={{ marginBottom: 16, borderRadius: 'var(--a-radius-sm)', border: '1px solid color-mix(in srgb, var(--a-danger) 22%, transparent)', background: 'var(--a-danger-bg)', color: 'var(--a-danger)', padding: '10px 14px', fontSize: 12, lineHeight: 1.55 }}>
							{err}
						</div>
					)}
					{step === 0 && <ProfileFields t={t} patch={patch} />}
					{step === 1 && <FundFields t={t} patch={patch} />}
					{step === 2 && <StageFields t={t} patch={patch} />}
					{step === 3 && <><GeographyFields t={t} patch={patch} /><SectorFields t={t} patch={patch} /><AttributeFields t={t} patch={patch} /></>}
					{step === 4 && <Review t={t} onEdit={(i) => { setStep(i); top(); }} />}
				</Card>

				<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
					<Button variant="ghost" disabled={step === 0 || busy} onClick={() => { setStep(step - 1); setErr(''); top(); }}><ArrowLeft size={13} /> Back</Button>
					<Button disabled={busy} onClick={() => void next()}>
						{busy ? <Loader2 className="animate-spin" size={13} /> : last ? <>Finish setup <Check size={13} /></> : <>Continue <ArrowRight size={13} /></>}
					</Button>
				</div>

				{/* The thesis is optional, so the way out has to stay visible — it used
				    to exist on step 0 only, where "Back" then replaced it and a user
				    part-way through had no exit but the browser button. */}
				<p style={{ textAlign: 'center', marginTop: 16 }}>
					<button type="button" className="scout-link" onClick={onClose}>
						{step === 0 ? 'Skip for now — I’ll do this later' : 'Skip for now — I’ll finish this later'}
					</button>
				</p>
			</Screen>
		</Frame>
	);
}

/**
 * The step bar, same geometry as the Raise wizard's: equal-width 6px bars
 * filled to and including the current step, with a three-way caption colour.
 *
 * Completed steps stay clickable. The Raise wizard's bar is inert, but this one
 * was clickable before and removing that to match would be a regression.
 */
function StepBar({ step, onPick }: { step: number; onPick: (i: number) => void }) {
	return (
		<div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))`, gap: 6, marginBottom: 26 }}>
			{STEPS.map(({ name }, i) => {
				const bar = <span style={{ display: 'block', height: 6, borderRadius: 3, background: i <= step ? 'var(--a-ink)' : 'var(--a-track)', transition: 'background 0.15s' }} />;
				const caption = (
					<span style={{ display: 'block', marginTop: 8, fontFamily: 'var(--a-mono)', fontSize: 9, lineHeight: 1.3, letterSpacing: '0.05em', textTransform: 'uppercase', color: i === step ? 'var(--a-ink)' : i < step ? 'var(--a-muted)' : 'var(--a-faint)', overflowWrap: 'anywhere' }}>{name}</span>
				);
				return i < step ? (
					<button key={name} type="button" onClick={() => onPick(i)} style={{ minWidth: 0, padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>{bar}{caption}</button>
				) : (
					<div key={name} style={{ minWidth: 0 }} aria-current={i === step ? 'step' : undefined}>{bar}{caption}</div>
				);
			})}
		</div>
	);
}

/**
 * Post-setup screen, on the Raise wizard's transition grammar: a checklist
 * card, then what the product does, then one glow card for the single next
 * action, then a ghost way out.
 *
 * It used to say “Profile submitted — we’ll email you when your profile is
 * verified”. Nothing submitted anything: the final step saves the thesis and
 * stamps setup, and the only route that files an investor claim
 * (`POST /scout/verification`) has never had a client caller. So the promise is
 * gone and the real thing is offered instead — `VerifyButton` infers the
 * investor form from the Scout tier, and the claim modal is mounted globally in
 * `app/providers.tsx`, so it works from here.
 */
function DoneScreen({ name, onEnter }: { name: string; onEnter: () => void }) {
	const first = name.trim().split(' ')[0];
	return (
		<div style={{ textAlign: 'center', padding: '32px 0' }}>
			<H1>{first ? `You’re set up, ${first}.` : 'You’re set up.'}</H1>
			<Card style={{ margin: '27px 0', textAlign: 'left', padding: 0, overflow: 'hidden' }}>
				{['Thesis saved to your account', 'Recommendations matched to your thesis', 'Signals scoped to your sectors and regions'].map((x, i) => (
					<div key={x} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 23px', borderTop: i ? '1px solid var(--a-border)' : 'none', fontSize: 13, color: 'var(--a-ink-2)' }}>
						<span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: '50%', background: 'var(--a-ok)', color: 'var(--a-page)', display: 'grid', placeItems: 'center' }}><Check size={12} /></span> {x}
					</div>
				))}
			</Card>
			<div className="atlas-eyebrow" style={{ marginBottom: 14, textAlign: 'left' }}>Here’s how Atlas Scout works</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24, textAlign: 'left' }}>
				{[
					['Discover', 'Companies matched to your thesis, plus the market data behind them.'],
					['Track', 'Watchlists and signals that follow the companies you care about.'],
					['Act', 'Deal Flow introductions when a round fits what you’re looking for.'],
				].map(([title, desc]) => (
					<Card key={title}>
						<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
						<div style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.55 }}>{desc}</div>
					</Card>
				))}
			</div>
			<Card glow="blue" style={{ textAlign: 'left', marginBottom: 20 }}>
				<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Get verified</div>
				<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.55, marginBottom: 16 }}>
					Verifying your fund lets the SportsTechX team confirm who you are, which is what opens Deal Flow
					introductions and the Investor Circle. Optional, and you can do it later from Account.
				</div>
				<VerifyButton label="Get verified" />
			</Card>
			<Button variant="ghost" onClick={onEnter}>Go to Scout <ArrowRight size={13} /></Button>
		</div>
	);
}

/**
 * The wizard's own header. The surrounding surface — background, height, the
 * close button — belongs to `SetupModal` now; this used to paint a full page
 * because the wizard was one.
 */
function Frame({ children, width = 720 }: { children: React.ReactNode; width?: number }) {
	return (
		<>
			<header className="atlas-screen" style={{ maxWidth: width, paddingTop: 26, paddingBottom: 0, display: 'flex', alignItems: 'center' }}>
				<AtlasLogo height={26} product="Scout" productColor={SCOUT_COLOR} />
			</header>
			{children}
		</>
	);
}

function Review({ t, onEdit }: { t: Thesis; onEdit: (step: number) => void }) {
	const v = (x: string | string[]) => (Array.isArray(x) ? x.join(', ') : x) || '—';
	const groups: [string, number, [string, string | string[]][]][] = [
		['Profile', 0, [['Name', t.name], ['Work email', t.email], ['Role', t.role], ['LinkedIn', t.linkedin]]],
		['Fund', 1, [['Fund / organisation', t.fundName], ['Investor type', t.investorType], ['Fund size / AUM', t.aum], ['Website', t.website], ['Headquarters', [t.city, t.country].filter(Boolean).join(', ')]]],
		['Stage & cheque', 2, [['Stages', t.stages], ['Cheque size', t.chequeMin || t.chequeMax ? `${t.chequeMin || '—'} – ${t.chequeMax || '—'}` : ''], ['Lead or follow', t.invStyle]]],
		['Investment focus', 3, [['Regions', t.regions], ['Sectors', t.sectors], ['Minimum traction', t.traction], ['Include', t.include], ['Exclude', t.exclude]]],
	];
	return (
		<div className="scout-review">
			{groups.map(([name, i, rows]) => (
				<div key={name}>
					<div className="scout-review__head"><span className="atlas-eyebrow">{name}</span><button type="button" className="scout-link" onClick={() => onEdit(i)}>Edit</button></div>
					{rows.map(([k, x]) => <div key={k} className="scout-review__row"><span>{k}</span><span className={v(x) === '—' ? 'scout-muted' : undefined}>{v(x)}</span></div>)}
				</div>
			))}
		</div>
	);
}
