'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button, Empty, Field, Input, Loading, Progress, Select } from '@/components/atlas';
import { DatePicker } from '@/components/atlas/ui/date-picker';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import {
	LEAD_LABEL, MY_STATUS, closeLabel, committedPct, companyLabel, money, submitterLabel,
	type DealRow, type DealTab, type MyDealRow,
} from './deal-types';

/**
 * Deal Flow (Claude Design "Deal Flow"): Featured deal, Verified Raises and
 * From the Circle, one page per tab, styled as in the design.
 *
 * The API only ever lists `status = 'live'` deals, so nothing here can be a
 * draft or a pending submission — which is why the old "Pending eligibility
 * check" pill is gone along with the sample data that produced it.
 *
 * The old "Thesis match" pill is gone too: there is no thesis-match signal in
 * the projection, and inventing one client-side from a sector *name* would be a
 * guess dressed up as a match.
 *
 * `is_featured` is orthogonal to `source`, so the All tab takes one request and
 * splits it locally rather than firing three.
 */
export const dealHref = (id: string) => `${hrefOf('deal-flow')}/${id}`;
/** Reopen one of your own submissions in the share wizard. */
const editHref = (id: string) => `${hrefOf('deal-flow-circle')}/share?draft=${id}`;

/**
 * The list caps at 50 server-side and returns no total, so there is nothing to
 * page against. 50 live deals is far beyond anything the table holds; if that
 * ever changes this needs real paging rather than a bigger number.
 */
const LIMIT = 50;

export function useDealFlow(tab: DealTab) {
	return useSWR<{ data: DealRow[] }>(qk.scout.dealflow({ tab, limit: LIMIT }));
}

export function DealFlow({ tab = 'all' }: { tab?: DealTab }) {
	const { data, isLoading, error } = useDealFlow(tab);
	// Valuation filter — purely client-side over the already-fetched page (≤50).
	const [maxVal, setMaxVal] = useState('');
	const [valCcy, setValCcy] = useState('EUR');

	// Every Deal Flow route 403s without a `scout_profiles` row, and most Scout
	// accounts do not have one — so this is the common path, not an edge case.
	// `SCOUT_NOT_SET_UP` is in EXPECTED_CODES, so it never toasts or logs.
	const needsThesis = (error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';
	const deals = data?.data ?? [];

	if (isLoading) return <Loading />;
	if (needsThesis) {
		return (
			<Empty>
				Set up your investment thesis and we&rsquo;ll show you deal flow that fits it.{' '}
				<Link href={hrefOf('thesis')} style={{ color: 'var(--a-accent)' }}>Set up your thesis</Link>
			</Empty>
		);
	}
	if (error) return <Empty>We couldn&rsquo;t load deal flow just now. Please try again.</Empty>;

	// Only constrain deals that have a disclosed amount in the chosen currency;
	// undisclosed, unpriced or other-currency deals always pass (not comparable).
	const max = Number(maxVal);
	const valActive = !!maxVal && Number.isFinite(max) && max > 0;
	const passesVal = (d: DealRow) => {
		if (!valActive || !d.valuation_amount || (d.currency_code ?? 'EUR') !== valCcy) return true;
		return Number(d.valuation_amount) <= max;
	};
	const featured = deals.find((d) => d.is_featured && passesVal(d));
	const verified = deals.filter((d) => d.source === 'verified_raise' && passesVal(d));
	const circle = deals.filter((d) => d.source === 'circle' && passesVal(d));

	const showFeatured = tab === 'all' || tab === 'featured';
	const showVerified = tab === 'all' || tab === 'verified';
	const showCircle = tab === 'all' || tab === 'circle';

	// Nothing live is not the same as nothing to show: a member may have a draft
	// or a returned submission, which is the whole point of `MySubmissions`. So
	// this is a branch inside the tree rather than an early return — an early
	// return here hid a member's own pending deal on the default tab, which is
	// precisely when they would come looking for it.
	const nothingLive = deals.length === 0;

	return (
		<div className="scout-df">
			{showCircle && <MySubmissions />}

			{!nothingLive && (
				<div className="scout-df__filter">
					<span className="scout-df__filter-label">Max valuation</span>
					<div style={{ width: 96 }}><Select value={valCcy} onChange={(e) => setValCcy(e.target.value)} options={[['EUR', 'EUR'], ['USD', 'USD']]} /></div>
					<div style={{ width: 170 }}><Input type="number" min="0" value={maxVal} onChange={(e) => setMaxVal(e.target.value)} placeholder={`e.g. ${valCcy === 'USD' ? '$' : '€'}10000000`} /></div>
					{valActive && <button type="button" className="scout-df__filter-clear" onClick={() => setMaxVal('')}>Clear</button>}
				</div>
			)}

			{nothingLive && (tab === 'all' || tab === 'featured') && (
				<Empty>
					{tab === 'featured'
						? 'No featured deal at the moment. Check the Verified Raises and Circle tabs.'
						: 'No live opportunities yet. We list a raise here once SportsTechX has checked it.'}
				</Empty>
			)}

			{showFeatured && featured && <FeaturedDeal d={featured} />}

			{showVerified && (tab === 'verified' || verified.length > 0) && (
				<section className="scout-df__section">
					<div className="scout-df__head">
						<h2 className="scout-df__title">Verified Raises</h2>
						<span className="scout-df__aside">Reviewed and verified by SportsTechX</span>
					</div>
					{verified.length === 0
						? <Empty>No verified raises are live right now.</Empty>
						: <div className="scout-df__grid">{verified.map((d) => <VerifiedCard key={d.id} d={d} />)}</div>}
				</section>
			)}

			{showCircle && (
				<section className="scout-df__section">
					<div className="scout-df__head">
						<h2 className="scout-df__title">From the Circle</h2>
						<Link href={`${hrefOf('deal-flow-circle')}/share`} className="scout-df__btn">+ Share a deal</Link>
					</div>
					<p className="scout-df__note">Opportunities shared by Investor Circle members. Eligibility checked by SportsTechX; not independently selected or endorsed.</p>
					{circle.length === 0
						? <Empty>Nothing shared by members yet. If you&rsquo;re in a round, share it with the Circle.</Empty>
						: <div className="scout-df__grid">{circle.map((d) => <CircleCard key={d.id} d={d} />)}</div>}
				</section>
			)}
		</div>
	);
}

/**
 * Your own submissions, above the Circle grid.
 *
 * The public list only ever shows `live` deals, so without this a submitter had
 * nowhere to see a draft, learn that their deal was still pending, or — the one
 * that actually matters — read **why** changes were requested. `review_notes`
 * is returned by `/mine` and by nothing else.
 *
 * Renders nothing at all when you have no submissions, which is the common
 * case: only a verified investor (or a granted account) can submit.
 * `SCOUT_NOT_SET_UP` is swallowed for the same reason — the surrounding page
 * already says it.
 */
function MySubmissions() {
	const { data, mutate } = useSWR<{ data: MyDealRow[] }>(qk.scout.dealflowMine());
	const mine = data?.data ?? [];
	if (mine.length === 0) return null;

	return (
		<section className="scout-df__section">
			<div className="scout-df__head">
				<h2 className="scout-df__title">Your submissions</h2>
				<span className="scout-df__aside">Only visible to you</span>
			</div>
			<div className="scout-df__grid">
				{mine.map((m) => {
					const target = money(m.target_amount, m.currency_code);
					return (
						<article key={m.id} className="scout-df-card scout-df-card--circle">
							<div className="scout-df-card__name">
								{m.company_name ?? 'Untitled draft'}
							</div>
							<div className="scout-df-card__round">
								{m.round_type ?? 'Round'}{target ? ` · ${target} target` : ''}
							</div>
							<div className="scout-df-card__by">{MY_STATUS[m.status] ?? m.status}</div>
							{/* The whole reason this section exists: a returned deal shows as
							    `pending` to its submitter unless the note is surfaced. */}
							{m.review_notes && (
								<p className="scout-df-card__desc">
									<strong>From the review team:</strong> {m.review_notes}
								</p>
							)}
							{!m.founder_consent && m.status === 'draft' && (
								<span className="scout-df-pending">Needs founder consent before it can be submitted</span>
							)}
							{/* A returned deal used to be a dead end: the note said what to
							    change and nothing could be changed. `PATCH :id` accepts both
							    of these statuses, so both get a way back into the wizard. */}
							{(m.status === 'draft' || m.status === 'changes_requested') && (
								<Link href={editHref(m.id)} className="scout-df-card__link">
									{m.status === 'draft' ? 'Continue this draft →' : 'Make the changes →'}
								</Link>
							)}
							{m.status === 'live' && (
								<>
									<Link href={dealHref(m.id)} className="scout-df-card__link">View listing →</Link>
									<LiveEdit m={m} onSaved={() => void mutate()} />
								</>
							)}
						</article>
					);
				})}
			</div>
		</section>
	);
}

/**
 * The three fields `PATCH /scout/dealflow/:id/live` lets a submitter move after
 * their deal is listed: how much is committed, whether a lead is confirmed, and
 * when it closes. Everything else is frozen once STX has reviewed it, which is
 * why this is a three-field panel and not the wizard again.
 *
 * The endpoint `COALESCE`s each column, so an untouched field is left alone
 * rather than cleared — a blank input here means "no change", not "set to null".
 */
function LiveEdit({ m, onSaved }: { m: MyDealRow; onSaved: () => void }) {
	const [open, setOpen] = useState(false);
	const [committed, setCommitted] = useState(m.committed_amount == null ? '' : String(Number(m.committed_amount)));
	const [lead, setLead] = useState(m.lead_status ?? '');
	const [close, setClose] = useState((m.target_close_date ?? '').slice(0, 10));
	const [busy, setBusy] = useState(false);

	if (!open) {
		return (
			<button type="button" className="scout-link" onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
				Update progress
			</button>
		);
	}

	const save = async () => {
		setBusy(true);
		try {
			const amount = Number(committed.replace(/[^0-9.]/g, ''));
			const res = await apiRequest('PATCH', `/api/scout/dealflow/${m.id}/live`, {
				committed_amount: Number.isFinite(amount) && amount > 0 ? amount : null,
				lead_status: lead || null,
				target_close_date: close || null,
			});
			if (!res.ok) throw new Error(String(res.status));
			toast.success('Updated');
			onSaved();
			setOpen(false);
		} catch {
			toast.error('We could not save that. Please try again.');
		} finally { setBusy(false); }
	};

	return (
		<div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
			<Field label={`Committed to date (${m.currency_code ?? 'EUR'})`}>
				<Input type="number" min="0" value={committed} onChange={(e) => setCommitted(e.target.value)} placeholder="500000" />
			</Field>
			<Field label="Lead status">
				<Select value={lead} onChange={(e) => setLead(e.target.value)} options={Object.entries(LEAD_LABEL)} placeholder="No change" />
			</Field>
			<Field label="Target close date">
				<DatePicker value={close} onChange={setClose} />
			</Field>
			<div style={{ display: 'flex', gap: 8 }}>
				<Button size="sm" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button>
				<Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
			</div>
		</div>
	);
}

function FeaturedDeal({ d }: { d: DealRow }) {
	const month = new Date().toLocaleDateString(undefined, { month: 'long' });
	const terms: [string, string][] = [
		['Round', d.round_type ?? '—'],
		['Target', money(d.target_amount, d.currency_code) ?? '—'],
		['Committed', money(d.committed_amount, d.currency_code) ?? '—'],
		['Valuation', d.valuation ?? 'Not disclosed'],
		['Sector', d.sector ?? '—'],
		// HQ is returned even for an anonymous company — a region does not identify
		// it — and the design shows only the country.
		['Geography', d.company_hq?.split(', ').pop() ?? '—'],
	];
	return (
		<article className="scout-df-feat">
			<div className="scout-df-feat__eyebrow">Featured deal · {month}</div>
			<div className="scout-df-feat__body">
				<div className="scout-df-feat__main">
					<h2 className="scout-df-feat__name">{companyLabel(d)}</h2>
					<p className="scout-df-feat__desc">{d.company_description ?? ''}</p>
					<Link href={dealHref(d.id)} className="scout-df-feat__btn" data-tour="scout-featured-deal">View opportunity →</Link>
				</div>
				<div className="scout-df-feat__terms">
					{terms.map(([k, v]) => <div key={k}><div className="scout-df-feat__k">{k}</div><div className="scout-df-feat__v">{v}</div></div>)}
				</div>
			</div>
		</article>
	);
}

function VerifiedCard({ d }: { d: DealRow }) {
	const pct = committedPct(d);
	const target = money(d.target_amount, d.currency_code);
	const committed = money(d.committed_amount, d.currency_code);
	const close = closeLabel(d.target_close_date);
	return (
		<article className="scout-df-card">
			<div className="scout-df-card__name">{companyLabel(d)}</div>
			<div className="scout-df-card__round">
				{d.round_type ?? 'Round'}{target ? ` · ${target} target` : ''}
			</div>
			{/* Only drawn when both figures are known — a 0% bar would read as
			    "nothing raised" rather than "not disclosed". */}
			{pct !== null && <div className="scout-df-bar"><Progress pct={pct} /></div>}
			{committed && <div className="scout-df-card__committed">{committed} committed</div>}
			<p className="scout-df-card__desc">{d.company_description ?? ''}</p>
			<div className="scout-df-card__verified"><span aria-hidden="true" />Verified by SportsTechX</div>
			{close && <div className="scout-df-card__close">Target close: {close}</div>}
			<Link href={dealHref(d.id)} className="scout-df-card__link">View opportunity →</Link>
		</article>
	);
}

function CircleCard({ d }: { d: DealRow }) {
	const target = money(d.target_amount, d.currency_code);
	return (
		<article className="scout-df-card scout-df-card--circle">
			<div className="scout-df-card__name">{companyLabel(d)}</div>
			<div className="scout-df-card__round">
				{d.round_type ?? 'Round'}{target ? ` · ${target} target` : ''}
			</div>
			<p className="scout-df-card__desc">{d.company_description ?? ''}</p>
			<div className="scout-df-card__by">Shared by {submitterLabel(d)}</div>
			<Link href={dealHref(d.id)} className="scout-df-card__link">View opportunity →</Link>
		</article>
	);
}
