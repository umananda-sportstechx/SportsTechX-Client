'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { AtlasLogo, Button, Card, Field, Input, Loading, PlaceholderTag, cx } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { InterestFields, NO_INTERESTS, useInterests, type Interests } from './interests';
import { EXPLORE_COLOR, LANDING_RAISE, LANDING_SCOUT } from './shell-config';

/**
 * Explore onboarding (Claude Design): intro → 1 About you → 2 Background →
 * 3 Goals → 4 Interests → 5 Product relevance (→ Raise / Scout suggestion) →
 * "Your Atlas is ready". Step 1 saves to the real profile (PATCH /api/profiles/me);
 * the rest is Backend Not Connected and kept in this browser.
 */
const BACKGROUNDS = ['Sports organisation', 'League or federation', 'Brand', 'Corporate innovation team', 'Consultant or agency', 'Service provider', 'Research or academia', 'Student', 'Media', 'Startup', 'Other'];
const RELEVANCE = ['I am raising capital for a company', 'I am looking for investment opportunities', 'Neither'];
const STEPS = ['About you', 'Your background', 'Your goals', 'Your interests', 'Product relevance'];
const PRODUCTS = {
	raise: {
		name: 'Atlas Raise', href: LANDING_RAISE, cta: 'Explore Atlas Raise', note: 'No commitment — see what is included first.',
		desc: 'A workspace for founders raising capital: sharpen the pitch, identify investors active in your category and manage the raise end to end.',
		points: ['Investor database with sector, stage and geography filters', 'Pitch review against what investors in sports tech look for', 'Raise tracker for conversations, materials and follow-ups'],
	},
	scout: {
		name: 'Atlas Scout', href: LANDING_SCOUT, cta: 'Request Atlas Scout', note: 'Access is granted after a short conversation.',
		desc: 'A workspace for investors and corporate teams: discover, research and evaluate companies across the sports-tech market.',
		points: ['Company screening across sectors, sports and geographies', 'Deal flow tracking with saved searches and alerts', 'Deeper company profiles with funding and traction signals'],
	},
};
type Screen = 'intro' | 0 | 1 | 2 | 3 | 4 | 'suggest' | 'ready';
interface Answers { background: string; relevance: string }

export function ExploreOnboarding() {
	const { data: profile, isLoading } = useUserProfile();
	if (isLoading) return <Frame><Loading /></Frame>;
	return <Flow initial={{ name: profile?.full_name ?? '', company: profile?.company_name ?? '', role: profile?.job_title ?? '' }} />;
}

function Flow({ initial }: { initial: { name: string; company: string; role: string } }) {
	const router = useRouter();
	const [screen, setScreen] = useState<Screen>('intro');
	const [about, setAbout] = useState(initial);
	const [saving, setSaving] = useState(false);
	const [answers, setAnswers] = usePlaceholderState<Answers>('explore-onboarding', { background: '', relevance: '' });
	const [savedInterests, saveInterests] = useInterests();
	const [interests, setInterests] = useState<Interests>(savedInterests);
	const [err, setErr] = useState('');
	const go = (s: Screen) => { setScreen(s); setErr(''); window.scrollTo(0, 0); };
	const product = answers.relevance === RELEVANCE[0] ? PRODUCTS.raise : answers.relevance === RELEVANCE[1] ? PRODUCTS.scout : null;

	const saveAbout = async () => {
		if (!about.name.trim()) { setErr('Add your full name to continue.'); return; }
		setSaving(true);
		try {
			const res = await apiRequest('PATCH', '/api/profiles/me', { full_name: about.name.trim(), company_name: about.company.trim() || null, job_title: about.role.trim() || null });
			if (!res.ok) throw new Error('Could not save your profile');
			await mutate(qk.profile());
			go(1);
		} catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
	};
	const next = () => {
		if (screen === 0) { void saveAbout(); return; }
		if (screen === 1 && !answers.background) { setErr('Choose the option that best describes you.'); return; }
		if (screen === 3) saveInterests(interests);
		if (screen === 4) { if (!answers.relevance) { setErr('Choose one option.'); return; } go(product ? 'suggest' : 'ready'); return; }
		go(((screen as number) + 1) as Screen);
	};

	if (screen === 'intro') return (
		<Frame>
			<h1 className="atlas-h1 explore-onb__title">Let&apos;s personalise your Atlas.</h1>
			<p className="explore-onb__lead">Tell us about yourself and the parts of sports tech you care about. Atlas will use this to organise your homepage and recommend what to explore.</p>
			<ul className="explore-onb__facts"><li>Takes around 3 minutes</li><li>Preferences can be changed later</li><li>Progress is saved automatically</li></ul>
			<Button onClick={() => go(0)}>Set up my Atlas</Button>
		</Frame>
	);

	if (screen === 'suggest' && product) return (
		<Frame>
			<div className="atlas-eyebrow">Recommended for you</div>
			<h1 className="atlas-h1 explore-onb__title">{product.name}</h1>
			<p className="explore-onb__lead">{product.desc}</p>
			<ul className="explore-onb__points">{product.points.map((p) => <li key={p}><Check size={13} aria-hidden="true" />{p}</li>)}</ul>
			<div className="explore-actions">
				<Link href={product.href} className="atlas-btn atlas-btn--primary">{product.cta}</Link>
				<span className="explore-muted">{product.note}</span>
			</div>
			<div className="explore-actions">
				<Button variant="outline" onClick={() => go('ready')}>No, continue with Atlas Explore for now</Button>
				<Button variant="ghost" onClick={() => go(4)}>Back</Button>
			</div>
			<p className="explore-muted">You can add either workspace later from your account.</p>
		</Frame>
	);

	if (screen === 'ready') return (
		<Frame>
			<h1 className="atlas-h1 explore-onb__title">Your Atlas is ready.</h1>
			<ul className="explore-onb__points">{['Profile created', 'Interests selected', 'Market view personalised', 'Recommended starting points identified'].map((r) => <li key={r}><Check size={13} aria-hidden="true" />{r}</li>)}</ul>
			<div className="atlas-eyebrow explore-onb__how">Here&apos;s how Atlas Explore works</div>
			<div className="explore-onb__how-grid">
				{[['Understand', 'Learn how the sports-tech market is structured.'], ['Explore', 'Research companies, sectors, sports and geographies.'], ['Keep current', 'Follow reports, monthly developments and upcoming events.']].map(([h, b]) => (
					<Card key={h}><div className="explore-access__name">{h}</div><p className="explore-muted">{b}</p></Card>
				))}
			</div>
			<Button onClick={() => router.push('/explore')}>Enter Atlas</Button>
			{answers.relevance !== RELEVANCE[0] && (
				<p className="explore-muted explore-onb__raise">You may also find Atlas Raise useful — a dedicated workspace for improving your pitch, finding investors and managing your raise. <Link href={LANDING_RAISE}>Explore Atlas Raise</Link></p>
			)}
		</Frame>
	);

	const step = screen as number;
	return (
		<Frame step={step}>
			<div className="atlas-eyebrow">{step + 1}. {STEPS[step]}</div>
			{step === 0 && <>
				<h1 className="atlas-h1 explore-onb__title">Who are we personalising this for?</h1>
				<div className="explore-onb__form">
					<Field label="Full name"><Input value={about.name} onChange={(e) => setAbout({ ...about, name: e.target.value })} /></Field>
					<Field label="Company or organisation"><Input value={about.company} onChange={(e) => setAbout({ ...about, company: e.target.value })} /></Field>
					<Field label="Role or job title"><Input value={about.role} onChange={(e) => setAbout({ ...about, role: e.target.value })} /></Field>
				</div>
				<p className="explore-muted">Company is optional for students, independent professionals and users without an affiliation.</p>
			</>}
			{step === 1 && <>
				<h1 className="atlas-h1 explore-onb__title">Which best describes you?<PlaceholderTag /></h1>
				<p className="explore-onb__lead">This sets the context Atlas uses when recommending content. It does not change your access.</p>
				<Options options={BACKGROUNDS} value={answers.background} onPick={(o) => { setAnswers({ ...answers, background: o }); setErr(''); }} />
			</>}
			{step === 2 && <>
				<h1 className="atlas-h1 explore-onb__title">What would you like to use Atlas for?<PlaceholderTag /></h1>
				<p className="explore-onb__lead">Select as many as apply.</p>
				<InterestFields value={interests} onChange={setInterests} keys={['goals']} />
			</>}
			{step === 3 && <>
				<h1 className="atlas-h1 explore-onb__title">Which parts of the market should Atlas prioritise?<PlaceholderTag /></h1>
				<p className="explore-onb__lead">These selections shape your homepage. They never limit what you can explore.</p>
				<InterestFields value={interests} onChange={setInterests} keys={['sectors', 'subs', 'sports', 'geos']} />
				<div className="explore-actions">
					<Button variant="outline" onClick={() => { const whole = { ...NO_INTERESTS, goals: interests.goals }; setInterests(whole); saveInterests(whole); go(4); }}>I want to explore the entire market</Button>
					<span className="explore-muted">Skip the detailed selections</span>
				</div>
			</>}
			{step === 4 && <>
				<h1 className="atlas-h1 explore-onb__title">Are either of these relevant to you?<PlaceholderTag /></h1>
				<p className="explore-onb__lead">This only tells us whether a dedicated workspace might be useful. Atlas Explore stays the same either way.</p>
				<Options options={RELEVANCE} value={answers.relevance} onPick={(o) => { setAnswers({ ...answers, relevance: o }); setErr(''); }} />
			</>}
			{err && <p className="explore-error" role="alert">{err}</p>}
			<div className="explore-actions">
				<Button disabled={saving} onClick={next}>Continue</Button>
				<Button variant="ghost" onClick={() => go(step === 0 ? 'intro' : ((step - 1) as Screen))}>Back</Button>
			</div>
		</Frame>
	);
}

function Options({ options, value, onPick }: { options: string[]; value: string; onPick: (o: string) => void }) {
	return (
		<div className="explore-options" role="radiogroup">
			{options.map((o) => <button key={o} type="button" role="radio" aria-checked={value === o} className={cx('explore-option', value === o && 'on')} onClick={() => onPick(o)}>{o}</button>)}
		</div>
	);
}

function Frame({ step, children }: { step?: number; children: React.ReactNode }) {
	return (
		<div className="explore-onb">
			<header className="explore-onb__head">
				<AtlasLogo height={28} product="Explore" productColor={EXPLORE_COLOR} />
				{step !== undefined && <span className="explore-onb__step">Step {step + 1} of {STEPS.length}</span>}
			</header>
			{step !== undefined && <div className="explore-onb__progress"><div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>}
			<main className="explore-onb__main">{children}</main>
		</div>
	);
}
