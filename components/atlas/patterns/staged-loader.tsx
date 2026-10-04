'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/card';

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
		<Card focus style={{ marginTop: 24, padding: '36px 32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
			<Loader2 className="spin" size={24} strokeWidth={1.25} color="var(--a-ink)" />
			<div style={{ margin: '18px 0 0', fontSize: 18, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)' }}>{title}</div>
			{note && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--a-muted)', maxWidth: 520, lineHeight: 1.55 }}>{note}</p>}

			<div className="stx-staged-stage" aria-live="polite">
				<span className="stx-staged-dot" aria-hidden />
				{stages[i]}
			</div>

			<div style={{ marginTop: 24, width: 'min(360px, 85%)', height: 6, borderRadius: 3, background: 'var(--a-track)', overflow: 'hidden' }}>
				<div className="stx-staged-bar" style={{ height: '100%', width: '40%', background: 'var(--a-primary)', borderRadius: 3 }} />
			</div>
			<style>{STAGED_CSS}</style>
		</Card>
	);
}

const STAGED_CSS = `
@keyframes stxStagedSlide{0%{transform:translateX(-110%)}100%{transform:translateX(360%)}}
.stx-staged-bar{animation:stxStagedSlide 1.3s ease-in-out infinite}
.stx-staged-stage{display:flex;align-items:center;gap:10px;margin-top:22px;font-family:var(--a-mono);font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:var(--a-ink)}
.stx-staged-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:currentColor}
`;
