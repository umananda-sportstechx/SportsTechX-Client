'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from './kit';

/**
 * A prominent, in-progress loader for long-running work (deck upload → analysis).
 * Cycles through stage messages so a ~1-minute wait feels active, with an
 * indeterminate progress bar. Atlas-styled. No deps, no real progress signal —
 * the messages are cosmetic pacing, the bar is indeterminate.
 */
export function StagedLoader({ title, stages, note }: { title: string; stages: string[]; note?: string }) {
	const [i, setI] = useState(0);
	useEffect(() => {
		if (stages.length <= 1) return;
		const t = setInterval(() => setI((v) => (v + 1) % stages.length), 2600);
		return () => clearInterval(t);
	}, [stages.length]);

	return (
		<Card focus style={{ marginTop: 24, padding: '40px 32px 46px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
			<Loader2 className="spin" size={30} color="var(--a-navy)" />
			<div style={{ margin: '22px 0 0', fontSize: 16, fontWeight: 600 }}>{title}</div>
			<div style={{ marginTop: 10, fontSize: 13, color: 'var(--a-muted)', minHeight: 20 }}>{stages[i] ?? stages[0]}</div>
			{note && <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--a-faint)', maxWidth: 520, lineHeight: 1.5 }}>{note}</p>}
			<div style={{ marginTop: 24, width: 'min(320px, 80%)', height: 4, borderRadius: 4, background: 'var(--a-inset)', overflow: 'hidden' }}>
				<div className="stx-staged-bar" style={{ height: '100%', width: '40%', background: 'var(--a-navy)', borderRadius: 4 }} />
			</div>
			<style>{'@keyframes stxStagedSlide{0%{transform:translateX(-110%)}100%{transform:translateX(360%)}}.stx-staged-bar{animation:stxStagedSlide 1.3s ease-in-out infinite}'}</style>
		</Card>
	);
}

/** Stage copy shared by the upload page + the streaming detail page. */
export const DECK_ANALYSIS_STAGES = [
	'Reading your deck…',
	'Scoring the story and product…',
	'Checking traction and financials…',
	'Weighing investor concerns…',
	'Writing your recommendations…',
];
