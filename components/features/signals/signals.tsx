'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Bookmark, BookmarkCheck, Globe } from 'lucide-react';
import { Action, Logo, Seg, cx } from '@/components/atlas';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { SAMPLE_SIGNALS, SIGNAL_COMPANIES, SIGNAL_TYPES, type SignalType } from './sample-signals';
import './signals.css';

/**
 * Discover → Signals (Claude Design "Signals"): company activity worth watching —
 * funding, fundraising, growth, partnerships, leadership and product news.
 * Shared by Raise and Scout. Backend Not Connected (marked on the nav/tab).
 */
export function Signals({ companiesHref }: { companiesHref: string }) {
	const [type, setType] = useState<'All' | SignalType>('All');
	const [watched, setWatched] = usePlaceholderState<string[]>('watched', ['zenniz', 'playermaker', 'fanwave']);
	const rows = SAMPLE_SIGNALS.filter((s) => type === 'All' || s.type === type);
	return (
		<>
			<div className="atlas-sig-head">
				<h2 className="atlas-h2">Signals</h2>
				<p className="atlas-sig-muted">Companies showing activity worth watching.</p>
			</div>
			<div className="atlas-sig-filter">
				<Seg ariaLabel="Signal type" value={type} onChange={setType} options={[{ key: 'All', label: 'All' }, ...SIGNAL_TYPES.map((t) => ({ key: t, label: t }))]} />
			</div>
			<div className="atlas-sig-list">
				{rows.map((s) => {
					const c = SIGNAL_COMPANIES[s.id];
					if (!c) return null;
					const on = watched.includes(c.id);
					return (
						<article key={`${s.id}-${s.type}`} className="atlas-card atlas-sig">
							<Logo co={{ name: c.name, website: c.site, custom_logo_url: null }} size={40} radius={8} />
							<div className="atlas-sig__main">
								<div className="atlas-sig__top"><span className="atlas-sig__name">{c.name}</span><span className="atlas-sig__type">{s.type}</span><span className="atlas-sig-muted">· {s.when}</span></div>
								<p className="atlas-sig__text">{s.text}</p>
								<div className="atlas-sig-muted">{c.sector} · {c.stage} · {c.hq}</div>
							</div>
							<div className="atlas-sig__actions">
								<button type="button" className={cx('atlas-sig__watch', on && 'on')} aria-pressed={on} onClick={() => setWatched((w) => (w.includes(c.id) ? w.filter((x) => x !== c.id) : [...w, c.id]))}>
									{on ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}{on ? 'Watching' : 'Watch'}
								</button>
								<Action icon={<Globe />} href={`https://${c.site}`} external>Website</Action>
								<Link className="atlas-action" href={`${companiesHref}?q=${encodeURIComponent(c.name)}`}><span className="atlas-action__icon"><ArrowUpRight /></span>View company</Link>
							</div>
						</article>
					);
				})}
			</div>
		</>
	);
}
