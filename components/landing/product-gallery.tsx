'use client';

import { useState } from 'react';
import type { SiteItem } from '@/lib/site-content';

/* eslint-disable @next/next/no-img-element */

/**
 * "Inside Atlas <product>" gallery block. A dark navy→magenta panel carries the
 * heading, the lorem desc and a segmented MAP/TRACK/CONNECT switcher; a white
 * app-window mockup sits inside the panel and deliberately protrudes past its
 * bottom edge (the design's signature overlap), which is why the panel must NOT
 * clip its overflow.
 *
 * `variant="b"` is the design's middle block: its header sits on the white
 * section ABOVE the panel instead of inside it, so the panel holds only the
 * mockup.
 *
 * The mockup shows a real uploaded screenshot when one exists for the selected
 * tab (Site assets → Atlas → Dashboard screenshots, in switcher order), and
 * falls back to the CSS-drawn window otherwise. `.lp-mockup` already carries the
 * design's 1223/649 ratio, radius, shadow and overflow, so the screenshot just
 * fills it.
 */
type Tab = 'MAP' | 'TRACK' | 'CONNECT';
const TABS: Tab[] = ['MAP', 'TRACK', 'CONNECT'];

function Switcher({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
	return (
		<div className="lp-seg">
			<div className="lp-seg-group">
				{TABS.map((t) => (
					<button key={t} type="button" className={`lp-seg-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
						{t}
					</button>
				))}
			</div>
		</div>
	);
}

function Mockup({ tab, shots }: { tab: Tab; shots?: SiteItem[] }) {
	// Clamp rather than index straight in: with 1 or 2 screenshots uploaded the
	// remaining tabs would otherwise drop back to the fake skeleton window and
	// show a real product shot beside an obvious placeholder.
	const shot = shots?.length
		? shots[Math.min(TABS.indexOf(tab), shots.length - 1)]
		: undefined;
	if (shot?.url) {
		return (
			<div className="lp-mockup">
				<img className="lp-mockup-img" src={shot.url} alt={shot.alt || `Atlas ${tab} view`} />
			</div>
		);
	}
	/* The design draws the same window for every tab; only the number of
	   skeleton rows shifts, which is enough to make the switcher feel live. */
	const rows = tab === 'TRACK' ? 4 : tab === 'CONNECT' ? 8 : 6;
	return (
		<div className="lp-mockup">
			<div className="lp-mockup-bar">
				<img src="/landing/atlas-a-dark.svg" alt="" />
				<span className="lp-mockup-avatar" />
			</div>
			<div className="lp-mockup-body">
				{Array.from({ length: rows }).map((_, i) => <span className="lp-sk" key={i} />)}
			</div>
		</div>
	);
}

export function ProductGallery({ title, accent, desc, variant, shots }: {
	title: string; accent: string; desc: string; variant: 'a' | 'b' | 'c'; shots?: SiteItem[];
}) {
	const [tab, setTab] = useState<Tab>(variant === 'b' ? 'TRACK' : variant === 'c' ? 'CONNECT' : 'MAP');

	const head = (
		<div className="lp-gallery-head">
			<div>
				<h2 className="lp-display lp-gallery-title">{title} <span>{accent}</span></h2>
				<p className="lp-gallery-desc">{desc}</p>
			</div>
			<Switcher tab={tab} setTab={setTab} />
		</div>
	);

	if (variant === 'b') {
		return (
			<div className="lp-gallery lp-gallery--light">
				<div className="lp-gallery-headwrap">{head}</div>
				<div className="lp-gallery-panel lp-gallery-panel--bare">
					<Mockup tab={tab} shots={shots} />
				</div>
			</div>
		);
	}

	return (
		<div className="lp-gallery">
			<div className="lp-gallery-panel">
				{head}
				<Mockup tab={tab} shots={shots} />
			</div>
		</div>
	);
}
