'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const LINKS: [string, string][] = [
	['EXPLORE', '#explore'],
	['RAISE', '#how-to-join'],
	['SCOUT', '#explore'],
	['FAQ', '#faq'],
];

export function LandingNav() {
	const [open, setOpen] = useState(false);
	return (
		<nav className={`lp-nav ${open ? 'menu-open' : ''}`}>
			<div className="lp-nav-inner">
				<Link href="/" className="lp-nav-mark" aria-label="Atlas">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src="/landing/atlas-a.svg" alt="Atlas" />
				</Link>
				<div className="lp-nav-right">
					<div className="lp-nav-links">
						{LINKS.map(([label, href]) => (
							<a key={label} className="lp-nav-link" href={href} onClick={() => setOpen(false)}>{label}</a>
						))}
					</div>
					<Link className="lp-btn lp-btn--login lp-btn--sm" href="/login">LOG IN</Link>
					<button className="lp-nav-toggle" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
						{open ? <X size={26} /> : <Menu size={26} />}
					</button>
				</div>
			</div>
		</nav>
	);
}
