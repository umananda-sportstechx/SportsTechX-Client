'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { SAMPLE_DEALS, type DealKind, type SampleDeal } from './sample-data';
import { hrefOf } from '@/lib/routes';

/**
 * Deal Flow (Claude Design "Deal Flow"): Featured deal, Verified Raises and
 * From the Circle, one page per tab, styled as in the design. Backend Not
 * Connected (marked on the nav/tabs): sample deals; deals shared via "Share a
 * deal" stay in this browser.
 */
export const dealHref = (id: string) => `/scout/deal-flow/${id}`;
const NO_DEALS: SampleDeal[] = [];

/** Sample deals plus any shared from this browser. */
export function useDeals(): SampleDeal[] {
	const [shared] = usePlaceholderState<SampleDeal[]>('shared-deals', NO_DEALS);
	return useMemo(() => [...SAMPLE_DEALS, ...shared], [shared]);
}

export function DealFlow({ kind }: { kind?: DealKind }) {
	const deals = useDeals();
	const show = (k: DealKind) => !kind || kind === k;
	const featured = deals.find((d) => d.kind === 'featured');
	return (
		<div className="scout-df">
			{show('featured') && featured && <FeaturedDeal d={featured} />}
			{show('verified') && (
				<section className="scout-df__section">
					<div className="scout-df__head">
						<h2 className="scout-df__title">Verified Raises</h2>
						<span className="scout-df__aside">Reviewed and verified by SportsTechX</span>
					</div>
					<div className="scout-df__grid">{deals.filter((d) => d.kind === 'verified').map((d) => <VerifiedCard key={d.id} d={d} />)}</div>
				</section>
			)}
			{show('circle') && (
				<section className="scout-df__section">
					<div className="scout-df__head">
						<h2 className="scout-df__title">From the Circle</h2>
						<Link href={`${hrefOf('deal-flow-circle')}/share`} className="scout-df__btn">+ Share a deal</Link>
					</div>
					<p className="scout-df__note">Opportunities shared by Investor Circle members. Eligibility checked by SportsTechX; not independently selected or endorsed.</p>
					<div className="scout-df__grid">{deals.filter((d) => d.kind === 'circle').map((d) => <CircleCard key={d.id} d={d} />)}</div>
				</section>
			)}
		</div>
	);
}

function FeaturedDeal({ d }: { d: SampleDeal }) {
	const month = new Date().toLocaleDateString(undefined, { month: 'long' });
	const terms: [string, string][] = [['Round', d.round], ['Target', d.target], ['Committed', d.committed], ['Valuation', d.valuation], ['Sector', d.sector], ['Geography', d.hq.split(', ').pop() ?? d.hq]];
	return (
		<article className="scout-df-feat">
			<div className="scout-df-feat__eyebrow">Featured deal · {month}</div>
			<div className="scout-df-feat__body">
				<div className="scout-df-feat__main">
					<h2 className="scout-df-feat__name">{d.name}</h2>
					<p className="scout-df-feat__desc">{d.desc}</p>
					<Link href={dealHref(d.id)} className="scout-df-feat__btn">View opportunity →</Link>
				</div>
				<div className="scout-df-feat__terms">
					{terms.map(([k, v]) => <div key={k}><div className="scout-df-feat__k">{k}</div><div className="scout-df-feat__v">{v}</div></div>)}
				</div>
			</div>
		</article>
	);
}

export function ThesisMatch() {
	return <span className="scout-df-match">Thesis match</span>;
}

function VerifiedCard({ d }: { d: SampleDeal }) {
	return (
		<article className="scout-df-card">
			<div className="scout-df-card__name">{d.name}</div>
			{d.fit && <ThesisMatch />}
			<div className="scout-df-card__round">{d.round} · {d.target} target</div>
			<div className="scout-df-bar"><div style={{ width: `${Math.max(0, Math.min(100, d.pct))}%` }} /></div>
			<div className="scout-df-card__committed">{d.committed} committed</div>
			<p className="scout-df-card__desc">{d.desc}</p>
			<div className="scout-df-card__verified"><span aria-hidden="true" />Verified by SportsTechX</div>
			<div className="scout-df-card__close">Target close: {d.close}</div>
			<Link href={dealHref(d.id)} className="scout-df-card__link">View opportunity →</Link>
		</article>
	);
}

function CircleCard({ d }: { d: SampleDeal }) {
	return (
		<article className="scout-df-card scout-df-card--circle">
			<div className="scout-df-card__name">{d.name}</div>
			{d.fit && <ThesisMatch />}
			<div className="scout-df-card__round">{d.round} · {d.target} target</div>
			<p className="scout-df-card__desc">{d.desc}</p>
			<div className="scout-df-card__by">Shared by {d.by}</div>
			{d.pending && <span className="scout-df-pending">Pending eligibility check</span>}
			<Link href={dealHref(d.id)} className="scout-df-card__link">View opportunity →</Link>
		</article>
	);
}
