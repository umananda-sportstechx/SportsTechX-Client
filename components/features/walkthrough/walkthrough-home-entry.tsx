'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Footprints } from 'lucide-react';
import { Button, FeedCard } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import type { SandboxProduct } from '@/lib/sandbox/types';
import { enterPractice } from './practice-actions';
import { usePracticeAccess } from './use-practice-access';
import './walkthrough.css';

/** Set once the first-visit chooser has been seen (dismissed or used). */
const SEEN_KEY = 'stx:walkthrough:welcome-seen';
/** Let Home settle before the chooser appears. */
const OPEN_DELAY_MS = 700;

const CHOICES: Array<{ product: SandboxProduct; title: string; body: string }> = [
	{ product: 'raise', title: 'Raising capital', body: 'Play a founder mid-raise in Atlas Raise: deck feedback, matched investors and a live pipeline.' },
	{ product: 'scout', title: 'Investing', body: 'Play an investor in Atlas Scout: thesis matches, a watchlist board and verified deal flow.' },
];

function readSeen(): boolean {
	try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}
function markSeen() {
	try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ }
}

/**
 * Walk the Pitch on Explore Home: a persistent card in "What needs your
 * attention", plus the same chooser opened once on a first visit. Real Explore
 * users only, never inside practice.
 */
export function WalkthroughHomeEntry() {
	const { canEnter } = usePracticeAccess();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!canEnter || readSeen()) return;
		const t = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
		return () => clearTimeout(t);
	}, [canEnter]);

	if (!canEnter) return null;

	const onOpenChange = (next: boolean) => {
		if (!next) markSeen();
		setOpen(next);
	};
	const choose = (product: SandboxProduct) => {
		markSeen();
		enterPractice(product, 'explore-home');
	};

	return (
		<>
			<FeedCard
				tag="Walk the Pitch"
				icon={Footprints}
				title="See Raise and Scout in action"
				body="A five-minute guided run through a paid workspace on sample data. Nothing you do there touches your account."
				onAction={() => setOpen(true)}
				actionLabel="Walk the pitch"
			/>
			<Modal
				open={open}
				onOpenChange={onOpenChange}
				icon={<Footprints size={18} />}
				title="New here? Walk the pitch"
				width={480}
				footer={<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Maybe later</Button>}
			>
				Take a short guided run through Atlas on sample data, then look around at your own pace. Which side of the table are you on?
				<div className="wt-choices">
					{CHOICES.map((c) => (
						<button key={c.product} type="button" className="wt-choice" onClick={() => choose(c.product)}>
							<span className="wt-choice__title">{c.title} <ArrowUpRight size={14} aria-hidden="true" /></span>
							<span className="wt-choice__body">{c.body}</span>
						</button>
					))}
				</div>
			</Modal>
		</>
	);
}
