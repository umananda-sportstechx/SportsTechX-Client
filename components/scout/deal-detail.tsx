'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Empty, Loading, Logo, cx } from '@/components/atlas';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import {
	INTEREST_LABEL, canOpenDocs, closeLabel, companyLabel, instrumentLabel, leadLabel, money,
	relationshipLabel, submitterLabel, type DealRow,
} from './deal-types';

/**
 * One Deal Flow opportunity: terms, summary, documents, introduction request.
 *
 * Three things here are load-bearing for the privacy model:
 *
 * 1. **Identity comes from the flags, not from nulls.** `company_anonymous` /
 *    `submitter_anonymous` / `disclosed` are always returned, so the page says
 *    "undisclosed" deliberately rather than rendering a blank.
 * 2. **Documents are offered only when the server would actually release
 *    them** — see `canOpenDocs`. An anonymous company's materials need
 *    disclosure even when `materials_access` is `immediate`, and the server
 *    answers one uniform 404 for both "no deck" and "not yours", so a wrongly
 *    offered button is indistinguishable from a bug.
 * 3. **Requesting an introduction grants nothing.** The response states
 *    `disclosed: false` explicitly so a client cannot mistake acceptance for
 *    access, and this page reflects the request's status, never "granted".
 *
 * `interest_status` on the row replaced a localStorage list of deal ids, so the
 * button is now right across devices and after a reload.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The five designed panels. Only the first has a column behind it today. */
const SECTIONS: [heading: string, blank: string][] = [
	['Company', 'No description provided yet.'],
	['Traction', 'Revenue, customers and growth are not published for this deal yet.'],
	['Market', 'Market position and competitors are not published for this deal yet.'],
	['Team', 'Founder and team detail is not published for this deal yet.'],
	['Round / Use of funds', 'Use of funds is not published for this deal yet.'],
];

export function DealDetail({ id }: { id: string }) {
	// A malformed id reaches Postgres as a bad uuid and surfaces as a 500 — there
	// is no ParseUUIDPipe on the route — so refuse it here instead of asking.
	const valid = UUID.test(id);
	const { data: d, error, isLoading, mutate } = useSWR<DealRow>(valid ? qk.scout.deal(id) : null);

	const [watched, setWatched] = usePlaceholderState<string[]>('watched', NONE);
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState('');
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	const needsThesis = (error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';
	if (needsThesis) {
		return (
			<Empty>
				Set up your investment thesis to view deal flow.{' '}
				<Link href={hrefOf('thesis')} style={{ color: 'var(--a-accent)' }}>Set up your thesis</Link>
			</Empty>
		);
	}
	if (isLoading && valid) return <Loading />;
	// The server returns one uniform 404 for "gone", "never existed" and "not
	// live" so that nothing is distinguishable by its error. Say one thing.
	if (!valid || error || !d) {
		return <Empty>This opportunity isn&rsquo;t available. <Link href={hrefOf('deal-flow')}>Back to Deal Flow</Link></Empty>;
	}

	const isCircle = d.source === 'circle';
	const isWatched = watched.includes(d.id);
	const label = d.is_featured ? 'Featured deal' : isCircle ? 'From the Circle' : 'Verified raise';
	const name = companyLabel(d);

	const terms: [string, string][] = [
		['Round', d.round_type ?? '—'],
		['Target', money(d.target_amount, d.currency_code) ?? '—'],
		['Committed', money(d.committed_amount, d.currency_code) ?? '—'],
		['Valuation', d.valuation ?? 'Not disclosed'],
		['Instrument', instrumentLabel(d.instrument) ?? '—'],
		['Target close', closeLabel(d.target_close_date) ?? '—'],
		// The lead investor's name is withheld with the company name, so fall back
		// to the status, which is never redacted.
		['Lead', d.lead_investor ?? leadLabel(d.lead_status) ?? '—'],
	];

	const requestIntro = async () => {
		setBusy(true);
		try {
			const res = await apiRequest('POST', `/api/scout/dealflow/${d.id}/interest`, {
				kind: 'introduction',
				// The modal always collected this and then dropped it on the floor.
				note: note.trim() || null,
			});
			if (!res.ok) throw new Error(String(res.status));
			toast.success('Request sent');
			setOpen(false); setNote('');
			void mutate();
		} catch {
			toast.error("Couldn't send your request. Please try again.");
		} finally { setBusy(false); }
	};

	return (
		<div className="scout-df">
			<Link href={hrefOf(isCircle ? 'deal-flow-circle' : 'deal-flow')} className="scout-df-card__link">
				← {isCircle ? 'From the Circle' : 'Deal Flow'}
			</Link>
			<header className="scout-dd-head">
				{/* `company_website` is null for an anonymous deal, so the logo falls
				    back to initials rather than fetching a favicon that would name it. */}
				<Logo co={{ name, website: d.company_website, custom_logo_url: null }} size={80} radius={9} />
				<div className="scout-dd-head__id">
					<div className="scout-dd-head__label">{label}</div>
					<h1 className="scout-dd-head__name">{name}</h1>
					<div className="scout-dd-head__meta">
						{[d.company_hq, d.sector].filter(Boolean).join(' · ') || '—'}
					</div>
				</div>
				<div className="scout-dd-head__actions">
					<button
						type="button" className="scout-df-pill" aria-pressed={isWatched}
						onClick={() => setWatched((prev) => (prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]))}
					>
						{isWatched ? 'Watching ✓' : 'Watch'}
					</button>
					<button
						type="button"
						className={cx('scout-df-pill', !d.interest_status && 'scout-df-pill--primary')}
						disabled={!!d.interest_status}
						onClick={() => setOpen(true)}
					>
						{d.interest_status ? INTEREST_LABEL[d.interest_status] ?? 'Requested' : 'Request introduction'}
					</button>
				</div>
			</header>

			{d.interest_status && (
				<div className="scout-dd-sent">
					{d.disclosed
						? 'SportsTechX has shared this opportunity with you in full.'
						: 'Request sent. SportsTechX will confirm with the company before sharing anything further, usually within two working days.'}
				</div>
			)}

			<div className="scout-dd-terms">
				{terms.map(([k, v]) => (
					<div key={k} className="scout-dd-term"><div className="scout-dd-term__k">{k}</div><div className="scout-dd-term__v">{v}</div></div>
				))}
			</div>

			<div className="scout-dd-grid">
				<div className="scout-dd-col">
					<section className="scout-dd-box scout-dd-box--summary">
						<h2 className="scout-dd-box__h">
							{isCircle ? `Shared by ${submitterLabel(d)}` : 'SportsTechX summary'}
						</h2>
						<p className="scout-dd-box__lead">
							{d.member_perspective ?? 'No summary provided yet.'}
						</p>
						{/* Returned even for an anonymous submitter — it is their view of
						    the deal, not their identity. */}
						{isCircle && d.member_relationship && (
							<p className="scout-dd-box__fine">
								Their relationship: {relationshipLabel(d.member_relationship)}
								{d.member_commitment ? ` · committing ${money(d.member_commitment, d.currency_code)}` : ''}
							</p>
						)}
					</section>
					{SECTIONS.map(([heading, blank], i) => (
						<section key={heading} className="scout-dd-box">
							<h2 className="scout-dd-box__h">{heading}</h2>
							<p className="scout-dd-box__text">
								{i === 0 ? d.company_description ?? blank : blank}
							</p>
						</section>
					))}
				</div>
				<div className="scout-dd-col">
					<Documents d={d} />
					<section className="scout-dd-box">
						<h2 className="scout-dd-box__h">Funding history</h2>
						<p className="scout-dd-box__text">Prior rounds are not published for this deal.</p>
					</section>
					{/* Only when the deal is linked to an Atlas company AND the company is
					    not being withheld — `company_id` is redacted alongside the name. */}
					{d.company_id && (
						<Link href={`${hrefOf('companies')}/${d.company_id}`} className="scout-df-card__link">
							View full company profile →
						</Link>
					)}
				</div>
			</div>

			{open && (
				<div className="scout-modal" role="presentation" onClick={() => setOpen(false)}>
					<div className="scout-dd-modal" role="dialog" aria-modal="true" aria-labelledby="intro-title" onClick={(e) => e.stopPropagation()}>
						<div className="scout-dd-modal__head">
							<h2 id="intro-title" className="scout-dd-modal__title">Request introduction to {name}</h2>
							<button type="button" className="scout-dd-modal__x" aria-label="Close" onClick={() => setOpen(false)}><X size={14} /></button>
						</div>
						<p className="scout-dd-modal__sub">SportsTechX will confirm with the company before sharing your details or theirs, usually within two working days.</p>
						<label className="scout-dd-modal__field">
							<span>Anything you&rsquo;d like us to include?<em> · Optional</em></span>
							<textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="We’re interested in learning more about..." />
						</label>
						<div className="scout-dd-modal__actions">
							<button type="button" className="scout-df-pill" onClick={() => setOpen(false)}>Cancel</button>
							<button type="button" className="scout-df-pill scout-df-pill--primary" disabled={busy} onClick={() => void requestIntro()}>
								{busy ? 'Sending…' : 'Send request'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/** Hoisted: `usePlaceholderState` keeps `fallback` in a dependency list. */
const NONE: string[] = [];

/**
 * The real documents panel.
 *
 * `has_deck` / `has_one_pager` tell us a file exists; `canOpenDocs` tells us
 * whether this viewer would actually be given it. Both are needed, because the
 * server answers the same 404 either way — so without the second check the UI
 * would offer a button that fails for a reason it cannot explain.
 *
 * The signed URL is fetched on click and never stored: it lasts four hours and
 * holding one in state would outlive the reason the viewer was allowed it.
 */
function Documents({ d }: { d: DealRow }) {
	const [busy, setBusy] = useState<string | null>(null);
	const allowed = canOpenDocs(d);
	const docs: [label: string, present: boolean, path: string][] = [
		['Pitch deck', d.has_deck, 'deck-url'],
		['One-pager', d.has_one_pager, 'one-pager-url'],
	];
	const present = docs.filter(([, p]) => p);

	const openDoc = async (slug: string) => {
		setBusy(slug);
		try {
			const res = await apiRequest('GET', `/api/scout/dealflow/${d.id}/${slug}`);
			if (!res.ok) throw new Error(String(res.status));
			const { url } = (await res.json()) as { url: string };
			window.open(url, '_blank', 'noopener,noreferrer');
		} catch {
			toast.error('That document isn’t available to you yet.');
		} finally { setBusy(null); }
	};

	return (
		<section className="scout-dd-box scout-dd-box--docs">
			<h2 className="scout-dd-box__h">Documents</h2>
			{present.length === 0 ? (
				<p className="scout-dd-box__text">No materials have been shared for this deal.</p>
			) : (
				present.map(([label, , slug]) => (
					<div key={label} className="scout-dd-doc">
						<div>
							<div className="scout-dd-doc__name">{label}</div>
							<div className="scout-dd-doc__meta">{allowed ? 'PDF' : 'Available after introduction'}</div>
						</div>
						{allowed ? (
							<button type="button" className="scout-dd-doc__open" disabled={busy === slug} onClick={() => void openDoc(slug)}>
								{busy === slug ? 'Opening…' : 'Open'}
							</button>
						) : <span className="scout-dd-doc__open" aria-disabled="true">Locked</span>}
					</div>
				))
			)}
			<p className="scout-dd-box__fine">
				{allowed
					? 'Shared where authorised by the company.'
					: 'Materials are released once SportsTechX has confirmed with the company.'}
			</p>
		</section>
	);
}
