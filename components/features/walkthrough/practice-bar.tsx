'use client';

import { Footprints, RotateCcw } from 'lucide-react';
import { hrefOf } from '@/lib/routes';
import { previewBasePath } from '@/lib/preview-mode';
import { PRODUCT_NAME } from './tours';
import { leavePractice, restartPractice } from './practice-actions';
import { usePracticeAccess } from './use-practice-access';
import './walkthrough.css';

/**
 * Slim strip above the navbar while practice is running. Tour phase: what this
 * is + Exit. View phase: view-only notice, Replay tour, Get Atlas X, Exit.
 * Every action ends in a full page load (practice-actions.ts).
 */
export function PracticeBar() {
	const { inPractice, practice } = usePracticeAccess();
	if (!inPractice || !practice.active) return null;
	const name = PRODUCT_NAME[practice.active];
	const isTour = practice.phase === 'tour';
	// In preview (app/preview/) there is no real account: "Get Atlas X" goes to
	// signup, not the (gated) plans page, and "Exit" leaves the preview tree
	// entirely rather than landing on a `/preview/*` page that still looks live
	// once practice state is cleared.
	const base = previewBasePath();

	return (
		<div className="wt-bar" role="status">
			<span className="wt-bar__tag">
				<Footprints size={12} aria-hidden="true" />
				{isTour ? `Walk the Pitch · ${name}` : 'Practice mode · view only'}
			</span>
			<span className="wt-bar__text">
				{isTour
					? `A guided run through Atlas ${name} on sample data. Your account isn't touched.`
					: `Look around Atlas ${name} on sample data. Changes are switched off.`}
			</span>
			<span className="wt-bar__actions">
				{!isTour && (
					<>
						<button type="button" className="wt-bar__btn" onClick={() => restartPractice()}><RotateCcw size={11} aria-hidden="true" /> Replay tour</button>
						<button type="button" className="wt-bar__btn wt-bar__btn--solid" onClick={() => leavePractice(base ? '/signup' : hrefOf('plans'))}>Get Atlas {name}</button>
					</>
				)}
				<button type="button" className="wt-bar__btn" onClick={() => leavePractice(base ? '/' : hrefOf('home'))}>Exit</button>
			</span>
		</div>
	);
}
