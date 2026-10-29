'use client';

import { useState } from 'react';
import type { SiteItem } from '@/lib/site-content';

/* eslint-disable @next/next/no-img-element */

/**
 * "Inside Atlas <product>" gallery block. A dark navy→magenta panel carries the
 * heading, the lorem desc and a segmented three-tab switcher (labels per tier); a white
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
/** Each tier's three tabs (a = Explore, b = Raise, c = Scout); the tab's position picks the screenshot. */
const TABS = {
	a: ['MAP', 'TRACK', 'CONNECT'],
	b: ['PREPARE', 'CONNECT', 'CLOSE'],
	c: ['DISCOVER', 'SOURCE', 'CONNECT'],
} as const;

function Switcher({ tabs, tab, setTab }: { tabs: readonly string[]; tab: number; setTab: (t: number) => void }) {
	return (
		<div className="lp-seg">
			<div className="lp-seg-group">
				{tabs.map((t, i) => (
					<button key={t} type="button" className={`lp-seg-btn ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
						{t}
					</button>
				))}
			</div>
		</div>
	);
}

function Mockup({ tab, label, shots }: { tab: number; label: string; shots?: SiteItem[] }) {
	// Clamp rather than index straight in: with 1 or 2 screenshots uploaded the
	// remaining tabs would otherwise drop back to the fake skeleton window and
	// show a real product shot beside an obvious placeholder.
	const shot = shots?.length
		? shots[Math.min(tab, shots.length - 1)]
		: undefined;
	if (shot?.url) {
		return (
			<div className="lp-mockup">
				<img className="lp-mockup-img" src={shot.url} alt={shot.alt || `Atlas ${label} view`} />
			</div>
		);
	}
	/* The design draws the same window for every tab; only the number of
	   skeleton rows shifts, which is enough to make the switcher feel live. */
	const rows = [6, 4, 8][tab] ?? 6;
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

export function ProductGallery({ id, title, accent, desc, variant, shots }: {
	id?: string; title: string; accent: string; desc: string; variant: 'a' | 'b' | 'c'; shots?: SiteItem[];
}) {
	const tabs = TABS[variant];
	const [tab, setTab] = useState(variant === 'b' ? 1 : variant === 'c' ? 2 : 0);

	const head = (
		<div className="lp-gallery-head">
			<div>
				<h2 className="lp-display lp-gallery-title">{title} <span>{accent}</span></h2>
				<p className="lp-gallery-desc">{desc}</p>
			</div>
			<Switcher tabs={tabs} tab={tab} setTab={setTab} />
		</div>
	);

	if (variant === 'b') {
		return (
			<div id={id} className="lp-gallery lp-gallery--light">
				<div className="lp-gallery-headwrap">{head}</div>
				<div className="lp-gallery-panel lp-gallery-panel--bare">
					<Mockup tab={tab} label={tabs[tab]} shots={shots} />
				</div>
			</div>
		);
	}

	return (
		<div id={id} className="lp-gallery">
			<div className="lp-gallery-panel">
				{head}
				<Mockup tab={tab} label={tabs[tab]} shots={shots} />
			</div>
		</div>
	);
}
