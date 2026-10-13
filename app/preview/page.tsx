'use client';

import { ArrowRight, Footprints } from 'lucide-react';
import type { SandboxProduct } from '@/lib/sandbox/types';
import { enterPractice } from '@/components/features/walkthrough/practice-actions';
import '@/components/landing/landing.css';
import './preview.css';

const CHOICES: { product: SandboxProduct; label: string; body: string }[] = [
	{ product: 'raise', label: 'Raise', body: 'You are a founder running a seed round — score a deck, match investors, run a pipeline.' },
	{ product: 'scout', label: 'Scout', body: 'You are an investor sourcing deals — match a thesis, build a watchlist, screen decks.' },
];

/**
 * Pre-signup "Walk the Pitch" chooser, linked from the landing page's CTAs.
 * Picking a product calls the exact same `enterPractice` the real in-app
 * entry points use (components/features/walkthrough/practice-actions.ts),
 * just landing on `/preview/<product>/home` instead of the real `/home` —
 * the only line that's different between a logged-in user starting this and
 * an anonymous visitor starting it.
 */
export default function PreviewChooserPage() {
	return (
		<div className="lp wt-preview-choose">
			<div className="wt-preview-choose__inner">
				<div className="lp-howjoin-eyebrow"><span><Footprints size={13} aria-hidden="true" /> Walk the Pitch</span><i /></div>
				<h1 className="lp-display wt-preview-choose__title">Which one are you?</h1>
				<p className="wt-preview-choose__desc">Pick a product to run its guided tour on sample data — no account, nothing real touched.</p>
				<div className="wt-preview-choose__grid">
					{CHOICES.map((c) => (
						<button
							key={c.product}
							type="button"
							className="wt-preview-choose__card"
							onClick={() => enterPractice(c.product, 'landing-preview-chooser', `/preview/${c.product}/home`)}
						>
							<span className="wt-preview-choose__card-label">Atlas {c.label}</span>
							<span className="wt-preview-choose__card-body">{c.body}</span>
							<span className="wt-preview-choose__card-go">Walk the Pitch <ArrowRight size={13} aria-hidden="true" /></span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
