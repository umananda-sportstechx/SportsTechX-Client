'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AtlasLogo, Button, Card, Loading, PlaceholderTag } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ProfileFields, FundFields, StageFields, GeographyFields, SectorFields, AttributeFields } from './thesis-form';
import { Steps } from './share-deal';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { useThesis } from './use-thesis';
import { SCOUT_COLOR } from './shell-config';
import type { Thesis } from './sample-data';
import { hrefOf } from '@/lib/routes';

/**
 * Investor onboarding (Claude Design "Onboarding"): Profile → Fund → Stage &
 * cheque → Investment focus → Review, then the "being verified" screen.
 * Sign-in stays on the existing Supabase login. Backend Not Connected: the
 * thesis is saved in this browser and nothing is submitted for verification.
 */
const STEPS: { name: string; title: string; sub: string }[] = [
	{ name: 'Profile', title: 'Tell us about you', sub: 'This is how you’ll appear to the SportsTechX team. We use it to verify your profile.' },
	{ name: 'Fund', title: 'Your fund', sub: 'Helps us verify your profile and match you with raises of the right size.' },
	{ name: 'Stage & cheque', title: 'Stage and cheque size', sub: 'Where you invest and how much you typically write.' },
	{ name: 'Investment focus', title: 'Investment focus', sub: 'Where you invest, what you invest in, and what you avoid. Atlas uses this to rank companies, signals and Deal Flow for you.' },
	{ name: 'Review', title: 'Review your thesis', sub: 'Check everything before submitting for verification. You can change your thesis at any time.' },
];
const required = (t: Thesis, step: number) => [
	() => (t.name.trim() && t.email.includes('@') ? '' : 'Add your full name and a valid work email.'),
	() => (t.fundName.trim() && t.investorType ? '' : 'Add your fund or organisation name and investor type.'),
	() => (t.stages.length ? '' : 'Select at least one stage.'),
	() => (!t.regions.length ? 'Select at least one region.' : !t.sectors.length ? 'Select at least one sector.' : ''),
	() => '',
][step]();

export function Onboarding() {
	const { isLoading } = useUserProfile();
	const [saved] = useThesis();
	// Seed the form once the profile has loaded, so name and email are prefilled.
	if (isLoading) return <Frame><Loading /></Frame>;
	return <OnboardingForm initial={saved} />;
}

function OnboardingForm({ initial }: { initial: Thesis }) {
	const router = useRouter();
	const [, save] = useThesis();
	const [, setOnboarded] = usePlaceholderState<boolean>('onboarded', false);
	const [t, setT] = useState<Thesis>(initial);
	const [step, setStep] = useState(0);
	const [err, setErr] = useState('');
	const [verify, setVerify] = useState(false);
	const patch = (p: Partial<Thesis>) => { setT({ ...t, ...p }); setErr(''); };
	const top = () => window.scrollTo(0, 0);

	if (verify) return (
		<Frame>
			<span className="scout-tag scout-tag--ok">Profile submitted</span>
			<h1 className="atlas-h1 scout-onb__title">Thanks, {t.name.split(' ')[0] || 'there'}. You’re almost in.</h1>
			<p className="scout-body">We’ll email {t.email || 'you'} when your profile is verified.</p>
			<div className="scout-verify">
				{[
					['01', 'Verification', 'The SportsTechX team reviews your profile and fund details, usually within 24 hours.'],
					['02', 'Your Scout is ready now', 'Recommendations, signals, watchlists and market data are already tuned to your thesis.'],
					['03', 'Full access after approval', 'Deal Flow introductions and the Investor Circle unlock once you’re verified.'],
				].map(([n, h, b]) => <Card key={n} className="scout-verify__step"><span className="atlas-eyebrow">{n}</span><div className="scout-verify__h">{h}</div><p className="scout-muted">{b}</p></Card>)}
			</div>
			<Button onClick={() => router.push(hrefOf('home'))}>Go to Scout</Button>
		</Frame>
	);

	const s = STEPS[step];
	const next = () => {
		const e = required(t, step);
		if (e) { setErr(e); return; }
		if (step === 4) { save(t); setOnboarded(true); setVerify(true); } else setStep(step + 1);
		top();
	};
	return (
		<Frame>
			<Steps names={STEPS.map((x) => x.name)} step={step} onPick={(i) => { setStep(i); setErr(''); }} />
			<div className="atlas-eyebrow">Step {step + 1} of {STEPS.length} · {s.name}</div>
			<h1 className="atlas-h1 scout-onb__title">{s.title}</h1>
			<p className="scout-body">{s.sub}</p>
			<Card className="scout-section">
				{step === 0 && <ProfileFields t={t} patch={patch} />}
				{step === 1 && <FundFields t={t} patch={patch} />}
				{step === 2 && <StageFields t={t} patch={patch} />}
				{step === 3 && <><GeographyFields t={t} patch={patch} /><SectorFields t={t} patch={patch} /><AttributeFields t={t} patch={patch} /></>}
				{step === 4 && <Review t={t} onEdit={(i) => { setStep(i); top(); }} />}
			</Card>
			{err && <p className="scout-error" role="alert">{err}</p>}
			<div className="scout-intro__actions">
				{step === 0 ? <Link href={hrefOf('home')} className="atlas-btn atlas-btn--outline">Skip to app</Link> : <Button variant="outline" onClick={() => { setStep(step - 1); top(); }}>← Back</Button>}
				<Button onClick={next}>{step === 4 ? 'Submit for verification' : 'Continue'}</Button>
			</div>
		</Frame>
	);
}

function Frame({ children }: { children: React.ReactNode }) {
	return (
		<div className="scout-onb">
			<header className="scout-onb__head"><AtlasLogo height={28} product="Scout" productColor={SCOUT_COLOR} /><PlaceholderTag /></header>
			<main className="scout-onb__main">{children}</main>
		</div>
	);
}

function Review({ t, onEdit }: { t: Thesis; onEdit: (step: number) => void }) {
	const v = (x: string | string[]) => (Array.isArray(x) ? x.join(', ') : x) || '—';
	const groups: [string, number, [string, string | string[]][]][] = [
		['Profile', 0, [['Name', t.name], ['Work email', t.email], ['Role', t.role], ['LinkedIn', t.linkedin]]],
		['Fund', 1, [['Fund / organisation', t.fundName], ['Investor type', t.investorType], ['Fund size / AUM', t.aum], ['Website', t.website], ['Headquarters', t.location]]],
		['Stage & cheque', 2, [['Stages', t.stages], ['Cheque size', t.chequeMin || t.chequeMax ? `${t.chequeMin || '—'} – ${t.chequeMax || '—'}` : ''], ['Lead or follow', t.invStyle]]],
		['Investment focus', 3, [['Regions', t.regions], ['Sectors', t.sectors], ['Minimum traction', t.traction], ['Include', t.include], ['Exclude', t.exclude]]],
	];
	return (
		<div className="scout-review">
			{groups.map(([name, i, rows]) => (
				<div key={name} className="scout-review__group">
					<div className="scout-review__head"><span className="atlas-eyebrow">{name}</span><button type="button" className="scout-link" onClick={() => onEdit(i)}>Edit</button></div>
					{rows.map(([k, x]) => <div key={k} className="scout-review__row"><span>{k}</span><span className={v(x) === '—' ? 'scout-muted' : undefined}>{v(x)}</span></div>)}
				</div>
			))}
		</div>
	);
}
