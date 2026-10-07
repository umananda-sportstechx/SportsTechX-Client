'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Empty, Logo, PlaceholderTag, cx } from '@/components/atlas';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { DEAL_HISTORY, DEAL_SECTIONS, sampleCompany } from './sample-data';
import { sampleCompanyHref } from './sample-company-bits';
import { useDeals } from './deal-flow';
import { hrefOf } from '@/lib/routes';

/** One Deal Flow opportunity (Claude Design "Deal"): terms, summary, documents, funding history, introduction request. */
export function DealDetail({ id }: { id: string }) {
	const d = useDeals().find((x) => x.id === id);
	const [intros, setIntros] = usePlaceholderState<string[]>('intro-requests', []);
	const [watched, setWatched] = usePlaceholderState<string[]>('watched', ['zenniz', 'playermaker', 'fanwave']);
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState('');
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);
	if (!d) return <Empty>Opportunity not found. <Link href={hrefOf('deal-flow')}>Back to Deal Flow</Link></Empty>;

	const co = sampleCompany(d.id);
	const sent = intros.includes(d.id);
	const isWatched = watched.includes(d.id);
	const label = d.kind === 'featured' ? 'Featured deal' : d.kind === 'circle' ? 'From the Circle' : 'Verified raise';
	const terms: [string, string][] = [['Round', d.round], ['Target', d.target], ['Committed', d.committed], ['Valuation', d.valuation], ['Instrument', d.instrument], ['Target close', d.close], ['Lead', d.lead]];
	const history = [...(DEAL_HISTORY[d.id] ?? []), ['Prior rounds', '—'] as [string, string]];

	return (
		<div className="scout-df">
			<Link href={hrefOf(d.kind === 'circle' ? 'deal-flow-circle' : 'deal-flow')} className="scout-df-card__link">← {d.kind === 'circle' ? 'From the Circle' : 'Deal Flow'}</Link>
			<header className="scout-dd-head">
				<Logo co={{ name: d.name, website: co?.site ?? null, custom_logo_url: null }} size={80} radius={9} />
				<div className="scout-dd-head__id">
					<div className="scout-dd-head__label">{label}<PlaceholderTag /></div>
					<h1 className="scout-dd-head__name">{d.name}</h1>
					<div className="scout-dd-head__meta">{d.hq} · {d.sector}</div>
				</div>
				<div className="scout-dd-head__actions">
					<button type="button" className="scout-df-pill" aria-pressed={isWatched} onClick={() => setWatched(isWatched ? watched.filter((x) => x !== d.id) : [...watched, d.id])}>{isWatched ? 'Watching ✓' : 'Watch'}</button>
					<button type="button" className={cx('scout-df-pill', !sent && 'scout-df-pill--primary')} disabled={sent} onClick={() => setOpen(true)}>{sent ? 'Introduction requested' : 'Request introduction'}</button>
				</div>
			</header>

			{sent && <div className="scout-dd-sent">Request sent. SportsTechX will confirm with the founder and introduce you by email, usually within two working days.</div>}

			<div className="scout-dd-terms">
				{terms.map(([k, v]) => <div key={k} className="scout-dd-term"><div className="scout-dd-term__k">{k}</div><div className="scout-dd-term__v">{v}</div></div>)}
			</div>

			<div className="scout-dd-grid">
				<div className="scout-dd-col">
					<section className="scout-dd-box scout-dd-box--summary">
						<h2 className="scout-dd-box__h">SportsTechX summary</h2>
						<p className="scout-dd-box__lead">{d.summary}</p>
					</section>
					{DEAL_SECTIONS.map(([k, v]) => (
						<section key={k} className="scout-dd-box"><h2 className="scout-dd-box__h">{k}</h2><p className="scout-dd-box__text">{v}</p></section>
					))}
				</div>
				<div className="scout-dd-col">
					<section className="scout-dd-box scout-dd-box--docs">
						<h2 className="scout-dd-box__h">Documents</h2>
						{[['Pitch deck', 'PDF · 24 pages'], ['One-pager', 'PDF · 1 page']].map(([n, m]) => (
							<div key={n} className="scout-dd-doc"><div><div className="scout-dd-doc__name">{n}</div><div className="scout-dd-doc__meta">{m}</div></div><span className="scout-dd-doc__open">Open</span></div>
						))}
						<p className="scout-dd-box__fine">Shared where authorised by the company.</p>
					</section>
					<section className="scout-dd-box">
						<h2 className="scout-dd-box__h">Funding history</h2>
						{history.map(([r, v]) => <div key={r} className="scout-dd-hist"><span>{r}</span><span>{v}</span></div>)}
					</section>
					<Link href={sampleCompanyHref(d)} className="scout-df-card__link">View full company profile →</Link>
				</div>
			</div>

			{open && (
				<div className="scout-modal" role="presentation" onClick={() => setOpen(false)}>
					<div className="scout-dd-modal" role="dialog" aria-modal="true" aria-labelledby="intro-title" onClick={(e) => e.stopPropagation()}>
						<div className="scout-dd-modal__head">
							<h2 id="intro-title" className="scout-dd-modal__title">Request introduction to {d.name}</h2>
							<button type="button" className="scout-dd-modal__x" aria-label="Close" onClick={() => setOpen(false)}><X size={14} /></button>
						</div>
						<p className="scout-dd-modal__sub">SportsTechX will confirm with the founder and introduce you by email, usually within two working days.</p>
						<label className="scout-dd-modal__field">
							<span>Anything you’d like us to include?<em> · Optional</em></span>
							<textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="We’re interested in learning more about..." />
						</label>
						<div className="scout-dd-modal__actions">
							<button type="button" className="scout-df-pill" onClick={() => setOpen(false)}>Cancel</button>
							<button type="button" className="scout-df-pill scout-df-pill--primary" onClick={() => { setIntros([...intros, d.id]); setOpen(false); setNote(''); }}>Send request</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
