'use client';

import { useState } from 'react';

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

function Mockup({ tab }: { tab: Tab }) {
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

export function ProductGallery({ title, accent, desc, variant }: { title: string; accent: string; desc: string; variant: 'a' | 'b' | 'c' }) {
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
					<Mockup tab={tab} />
				</div>
			</div>
		);
	}

	return (
		<div className="lp-gallery">
			<div className="lp-gallery-panel">
				{head}
				<Mockup tab={tab} />
			</div>
		</div>
	);
}
