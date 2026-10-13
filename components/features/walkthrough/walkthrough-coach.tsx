'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Footprints, LifeBuoy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/atlas';
import { finishTour, setTourStep, usePractice } from '@/lib/sandbox/store';
import { matchPath } from '@/lib/sandbox/match-path';
import type { Tour, TourStep } from '@/lib/sandbox/tour-types';
import type { SandboxProduct } from '@/lib/sandbox/types';
import { hrefOf } from '@/lib/routes';
import { previewBasePath } from '@/lib/preview-mode';
import { track } from '@/lib/analytics';
import { CoachText } from './coach-text';
import { leavePractice, restartPractice } from './practice-actions';
import { PRODUCT_NAME, TOURS } from './tours';
import { useTourAdvance } from './use-tour-advance';
import { useTourTarget, type TargetBox } from './use-tour-target';
import './walkthrough.css';

const HELP_HREF = 'mailto:hello@sportstechx.com?subject=Walk%20the%20Pitch%20question';
/** Full-height panel width (desktop) — keep in sync with --wt-panel-w in walkthrough.css. */
const PANEL_WIDTH = 360;
/** A target under the docked panel flips it to the other side. */
const PANEL_CLEARANCE = PANEL_WIDTH + 40;
const SPOTLIGHT_PAD = 6;
/** Where the pointer line leaves the panel — level with the instruction text, not the target's own height. */
const ARROW_ANCHOR_Y = 190;

const hasParams = (path: string) => /\/:/.test(path);

function isTyping(el: EventTarget | null): boolean {
	if (!(el instanceof HTMLElement)) return false;
	return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/**
 * Walk the Pitch coach: the guided tour over the real app (lib/sandbox/tours).
 * Mounted by AppShell only while practice is in its `tour` phase.
 *
 * Intro → steps → finale. Each step opens on its page (navigated to unless the
 * path has `:params`, which the previous step's advance brings the user to),
 * spotlights its `data-tour` element and waits for its advance condition.
 */
export function WalkthroughCoach() {
	const { active, phase, step } = usePractice();
	if (!active || phase !== 'tour') return null;
	return <Coach product={active} tour={TOURS[active]} step={step} />;
}

function Coach({ product, tour, step }: { product: SandboxProduct; tour: Tour; step: number }) {
	const router = useRouter();
	const rawPathname = usePathname() ?? '';
	// Tour step paths (lib/sandbox/tours/*) are canonical, un-prefixed paths —
	// frozen into the Tour object at module load, long before a preview base
	// path could exist. Strip it back off here so every comparison below stays
	// the same in both contexts; only the actual navigation re-adds it.
	const base = previewBasePath();
	const pathname = base && rawPathname.startsWith(base) ? rawPathname.slice(base.length) || '/' : rawPathname;
	const [introDone, setIntroDone] = useState(step > 0);
	const total = tour.steps.length;
	const showIntro = step === 0 && !introDone;
	const isFinale = step >= total;
	const current: TourStep | null = showIntro || isFinale ? null : tour.steps[step];
	const stepKey = current ? `${step}:${current.id}` : showIntro ? 'intro' : 'finale';

	// Open the step's page once per step; never push a path with `:params`.
	const navigatedFor = useRef('');
	useEffect(() => {
		if (!current || navigatedFor.current === stepKey) return;
		navigatedFor.current = stepKey;
		if (matchPath(current.path, pathname) || hasParams(current.path)) return;
		router.push(base ? `${base}${current.path}` : current.path);
	}, [current, stepKey, pathname, router, base]);

	const { box, missing } = useTourTarget(current?.target, stepKey);

	const advance = useCallback(() => {
		if (!current) return;
		track(`walkthrough:${product}:${current.id}:done`);
		setTourStep(step + 1);
	}, [current, product, step]);
	useTourAdvance(current, pathname, advance);

	const back = useCallback(() => {
		if (showIntro) return;
		if (step === 0) { setIntroDone(false); return; }
		setTourStep(step - 1);
	}, [showIntro, step]);

	const skip = () => {
		track(`walkthrough:${product}:${current?.id ?? (showIntro ? 'intro' : 'finale')}:skip`);
		finishTour();
	};
	const finish = (choice: 'upgrade' | 'explore' | 'replay') => {
		track(`walkthrough:${product}:finish`, { choice });
		// In preview there is no real account to send "upgrade" to, and "replay"
		// must land back on the preview's own home, not the real (gated) one.
		if (choice === 'upgrade') leavePractice(base ? '/signup' : hrefOf('plans'));
		else if (choice === 'replay') restartPractice(base ? `${base}/home` : undefined);
		else finishTour();
	};

	const adv = current?.advance.kind;
	const canNext = !!current && (adv === 'next' || missing || (adv === 'click' && !current.target));
	const primary = useCallback(() => {
		if (showIntro) setIntroDone(true);
		else if (canNext) advance();
	}, [showIntro, canNext, advance]);

	useCoachKeys(back, primary, showIntro || canNext);

	const side = box && box.left + box.width > window.innerWidth - PANEL_CLEARANCE && box.left > PANEL_CLEARANCE ? 'left' : 'right';
	const label = PRODUCT_NAME[product];

	// Full-height panel takes real screen width — give the app room beside it
	// instead of sitting on top of it, so nothing on the page is hidden behind it.
	useEffect(() => {
		document.body.classList.add('wt-coach-open', `wt-coach-open--${side}`);
		return () => document.body.classList.remove('wt-coach-open', 'wt-coach-open--left', 'wt-coach-open--right');
	}, [side]);

	return (
		<>
			{box && <Spotlight box={box} />}
			{box && <Pointer box={box} side={side} />}
			<aside className={`wt-coach wt-coach--${side}`} aria-label={`Walk the Pitch: Atlas ${label}`}>
				<div className="wt-coach__eyebrow"><Footprints size={12} aria-hidden="true" /> Walk the Pitch · {label}</div>
				{showIntro ? (
					<div className="wt-coach__body" aria-live="polite">
						<h2 className="wt-coach__title wt-coach__title--big">{tour.intro.title}</h2>
						<p className="wt-coach__text"><CoachText text={tour.intro.body} /></p>
						<p className="wt-coach__note">{total} short steps on sample data. Nothing you do here touches your account.</p>
						<div className="wt-coach__actions">
							<Button variant="ghost" size="sm" onClick={skip}>Skip tour</Button>
							<Button size="sm" onClick={() => setIntroDone(true)}>Start <ArrowRight size={13} aria-hidden="true" /></Button>
						</div>
					</div>
				) : isFinale ? (
					<div className="wt-coach__body" aria-live="polite">
						<h2 className="wt-coach__title wt-coach__title--big">{tour.finale.title}</h2>
						<p className="wt-coach__text"><CoachText text={tour.finale.body} /></p>
						<div className="wt-coach__stack">
							<Button size="sm" onClick={() => finish('upgrade')}>Get Atlas {label}</Button>
							<Button variant="outline" size="sm" onClick={() => finish('explore')}>Keep exploring (view-only)</Button>
							<Button variant="ghost" size="sm" onClick={() => finish('replay')}><RotateCcw size={13} aria-hidden="true" /> Replay</Button>
						</div>
					</div>
				) : current && (
					<div className="wt-coach__body" aria-live="polite">
						<div className="wt-coach__progress">
							<span>Step {step + 1} of {total}</span>
							<span className="wt-coach__track" aria-hidden="true"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></span>
						</div>
						<h2 className="wt-coach__title wt-coach__title--big">{current.title}</h2>
						<p className="wt-coach__text wt-coach__text--lead"><CoachText text={current.body} /></p>
						{box && <p className="wt-coach__cue">{side === 'right' ? '←' : '→'} Look for the glow on your {side === 'right' ? 'left' : 'right'}</p>}
						{missing && <p className="wt-coach__note">Can&apos;t spot it on this page? Carry on with Next.</p>}
						<div className="wt-coach__actions">
							<Button variant="ghost" size="sm" onClick={back}><ArrowLeft size={13} aria-hidden="true" /> Back</Button>
							<Button variant="ghost" size="sm" onClick={skip}>Skip tour</Button>
							{canNext && <Button size="sm" onClick={advance}>Next <ArrowRight size={13} aria-hidden="true" /></Button>}
						</div>
					</div>
				)}
				<a className="wt-coach__help" href={HELP_HREF}><LifeBuoy size={12} aria-hidden="true" /> Need a hand?</a>
			</aside>
		</>
	);
}

function Spotlight({ box }: { box: TargetBox }) {
	return (
		<div
			className="wt-spotlight"
			aria-hidden="true"
			style={{
				top: box.top - SPOTLIGHT_PAD, left: box.left - SPOTLIGHT_PAD,
				width: box.width + SPOTLIGHT_PAD * 2, height: box.height + SPOTLIGHT_PAD * 2,
			}}
		/>
	);
}

/**
 * A drawn line from the edge of the panel out to the highlighted element, so
 * which one it's talking about is never a guess (components/scout/recommended.tsx
 * used to highlight the wrong thing on its own — the line removes the ambiguity
 * a ring alone can leave).
 */
function Pointer({ box, side }: { box: TargetBox; side: 'left' | 'right' }) {
	const panelEdgeX = side === 'right' ? window.innerWidth - PANEL_WIDTH : PANEL_WIDTH;
	const startY = Math.min(Math.max(ARROW_ANCHOR_Y, box.top + box.height / 2 - 240), box.top + box.height / 2 + 240);
	const endX = side === 'right' ? box.left + box.width + SPOTLIGHT_PAD + 4 : box.left - SPOTLIGHT_PAD - 4;
	const endY = box.top + box.height / 2;
	const midX = (panelEdgeX + endX) / 2;
	const d = `M ${panelEdgeX} ${startY} Q ${midX} ${startY} ${midX} ${(startY + endY) / 2} T ${endX} ${endY}`;
	return (
		<svg className="wt-pointer" aria-hidden="true" width="100%" height="100%">
			<defs>
				<marker id="wt-pointer-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0,0 L10,5 L0,10 z" className="wt-pointer__head" />
				</marker>
			</defs>
			<path d={d} className="wt-pointer__line" markerEnd="url(#wt-pointer-head)" />
		</svg>
	);
}

/** Escape = Back, Enter = the primary action — never while typing, on a focused control, or under another dialog. */
function useCoachKeys(back: () => void, primary: () => void, enterEnabled: boolean) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
			if (isTyping(e.target) || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
			if (e.key === 'Escape') { e.preventDefault(); back(); return; }
			if (e.key !== 'Enter' || !enterEnabled) return;
			if (e.target instanceof HTMLElement && /^(BUTTON|A)$/.test(e.target.tagName)) return;
			e.preventDefault();
			primary();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [back, primary, enterEnabled]);
}
