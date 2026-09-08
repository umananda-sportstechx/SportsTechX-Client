'use client';

import { useState } from 'react';

type Tab = 'MAP' | 'TRACK' | 'CONNECT';
const TABS: Tab[] = ['MAP', 'TRACK', 'CONNECT'];

export function ProductGallery({ title, desc, variant }: { title: string; desc: string; variant: 'a' | 'b' | 'c' }) {
	const [tab, setTab] = useState<Tab>(variant === 'b' ? 'TRACK' : variant === 'c' ? 'CONNECT' : 'MAP');
	return (
		<div className="lp-gallery">
			<div className="lp-inner">
				<div className="lp-gallery-head">
					<h2>{title}</h2>
					<p>{desc}</p>
				</div>
				<div className="lp-gallery-card">
					<div className="lp-gallery-topbar">
						<div className="lp-switcher">
							{TABS.map((t) => (
								<button key={t} className={`lp-switch-tag ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ color: tab === t ? '#fff' : 'rgba(255,255,255,.6)', borderColor: 'rgba(255,255,255,.16)', background: tab === t ? 'var(--lp-pink)' : 'transparent' }}>
									{t}
								</button>
							))}
						</div>
					</div>
					<div className="lp-mockup">
						<div className="lp-mockup-side">
							<div className="lp-mockup-topline"><span className="lp-mockup-dot" /><div className="lp-sk" style={{ width: 90 }} /></div>
							<div className="lp-sk-row">
								{Array.from({ length: 6 }).map((_, i) => <div className="lp-sk" key={i} style={{ width: `${90 - i * 6}%` }} />)}
							</div>
						</div>
						<div className="lp-mockup-main">
							<div className="lp-mockup-topline">
								<div className="lp-sk" style={{ width: 140 }} />
								<div style={{ flex: 1 }} />
								{Array.from({ length: 4 }).map((_, i) => <div className="lp-mockup-dot" key={i} />)}
								<div className="lp-mockup-dot" style={{ width: 28, height: 28, background: '#f0eef4' }} />
							</div>
							{tab === 'TRACK' ? (
								<div className="lp-sk-row">
									{Array.from({ length: 8 }).map((_, i) => <div className="lp-sk" key={i} style={{ height: 22, width: `${100 - (i % 3) * 8}%` }} />)}
								</div>
							) : (
								<div className="lp-mockup-grid">
									{Array.from({ length: tab === 'CONNECT' ? 6 : 9 }).map((_, i) => (
										<div className="lp-mockup-tile" key={i} style={tab === 'CONNECT' ? { borderRadius: 99, height: 96, width: 96, background: 'linear-gradient(135deg,#f0eef4,#e7dce4)' } : undefined} />
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
