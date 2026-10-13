'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowUpRight, Check, Minus } from 'lucide-react';
import { Empty, Loading, Logo, cx } from '@/components/atlas';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { qk } from '@/lib/query-keys';
import { companyHref, hrefOf } from '@/lib/routes';
import { fmtUsd } from '@/components/features/market/format';
import './recommended.css';

/**
 * Discover → Recommended, from `GET /api/scout/recommended`.
 *
 * Companies scored against the investor's thesis. This rendered
 * `SAMPLE_COMPANIES` until now, with a comment claiming "no endpoint scores
 * companies against an investor thesis yet" — there is one, and it returns the
 * per-dimension flags the "Why it matches" chips need.
 *
 * Those flags matter: the server deliberately scores live rather than reading a
 * blended offline score, because *"a blended score cannot say which dimension
 * matched, and the chips claim exactly that"*. So each chip is backed by its
 * own boolean, not inferred from a total.
 *
 * "Not relevant" stays browser-local. The brief wants passed companies kept so
 * they are not re-recommended, but no endpoint records a pass yet — dismissing
 * server-side would be inventing a contract.
 */
interface Recommendation {
	id: string;
	name: string;
	slug: string | null;
	description: string | null;
	website: string | null;
	custom_logo_url: string | null;
	sector: string | null;
	city: string | null;
	country: string | null;
	total_funding_usd: string | null;
	latest_round: string | null;
	match_sector: boolean;
	match_geo: boolean;
	match_stage: boolean;
	match_cheque: boolean;
	/** Matches what the Scout has been searching for / asking about, not the
	 *  declared thesis — shown as a distinct "from your activity" chip. */
	match_activity: boolean;
	match_count: number;
}

/** Only the four boolean dimensions — `keyof Recommendation` would widen to
 *  include `match_count` and the string fields. */
type MatchKey = 'match_sector' | 'match_geo' | 'match_stage' | 'match_cheque';
const CHIPS: [label: string, key: MatchKey][] = [
	['Sector', 'match_sector'],
	['Geography', 'match_geo'],
	['Stage', 'match_stage'],
	['Cheque', 'match_cheque'],
];

const place = (c: Recommendation) => [c.city, c.country].filter(Boolean).join(', ');

export function Recommended() {
	const { data, isLoading, error } = useSWR<{ data: Recommendation[] }>(qk.scout.recommended({ limit: 24 }));
	// Recommending against a thesis that does not exist is meaningless, so this
	// is the one Discover surface that stays gated — but "set yours up" is the
	// answer, not an error. Browsing and Signals work without one.
	const needsThesis = (error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';
	const [dismissed, setDismissed] = usePlaceholderState<string[]>('dismissed-recs', []);

	const all = data?.data ?? [];
	const rows = all.filter((c) => !dismissed.includes(c.id));
	const lastId = dismissed[dismissed.length - 1];
	const lastName = all.find((c) => c.id === lastId)?.name;

	return (
		<>
			<div className="scout-subhead">
				<div>
					<h2 className="atlas-h2">Recommended for you</h2>
					<p className="scout-muted">Companies matching your investment thesis.</p>
				</div>
				<Link href={hrefOf('thesis')} className="scout-link">Edit thesis</Link>
			</div>

			{lastId && (
				<div className="scout-undo">
					<span>{lastName ?? 'Company'} marked not relevant{dismissed.length > 1 ? ` (+${dismissed.length - 1} more)` : ''}.</span>
					<button type="button" className="scout-link" onClick={() => setDismissed(dismissed.slice(0, -1))}>Undo</button>
				</div>
			)}

			{isLoading ? <Loading />
				: needsThesis ? (
					<Empty>
						Set up your investment thesis and Atlas will match companies to it.{' '}
						<Link href={hrefOf('thesis')} className="scout-link">Set up thesis</Link>
					</Empty>
				)
				: error ? <Empty>Couldn&apos;t load your recommendations. Please try again.</Empty>
				: all.length === 0 ? (
					<Empty>
						No companies match your thesis yet. <Link href={hrefOf('thesis')} className="scout-link">Widen it</Link> — a narrow
						thesis can match nothing at all.
					</Empty>
				) : rows.length === 0 ? (
					<Empty>You&apos;ve dismissed every match. Undo above, or widen your thesis.</Empty>
				) : (
					<div className="atlas-rec-list">
						{rows.map((c, i) => (
							<article key={c.id} className="atlas-rec">
								<div className="atlas-rec__top">
									<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={72} radius={9} />
									<div className="atlas-rec__id">
										<div className="atlas-rec__line">
											<Link href={companyHref(c.slug ?? c.id)} className="atlas-rec__name">{c.name}</Link>
											{place(c) && <span className="atlas-rec__meta">{place(c)}</span>}
										</div>
										{c.description && <p className="atlas-rec__desc">{c.description}</p>}
										<div className="atlas-rec__facts">
											{c.sector && <span className="atlas-rec__chip">{c.sector}</span>}
											<span className="atlas-rec__raised">
												{fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd))} raised
												{c.latest_round ? ` · ${c.latest_round}` : ''}
											</span>
										</div>
									</div>
								</div>

								{/* Indented under the identity, as in the mockup, so the reason
								    reads as belonging to this company rather than the list. */}
								<div className="atlas-rec__why">
									<div className="atlas-rec__whyhead">
										<span className="atlas-rec__whylabel">Why it matches</span>
										{CHIPS.map(([label, key]) => (
											<span key={label} className={cx('atlas-rec__check', c[key] && 'on')}>
												{c[key] ? <Check size={11} strokeWidth={2.25} aria-hidden="true" /> : <Minus size={11} strokeWidth={2} aria-hidden="true" />}
												{label}
											</span>
										))}
										{c.match_activity && (
											<span className="atlas-rec__check on atlas-rec__check--activity">
												<Check size={11} strokeWidth={2.25} aria-hidden="true" />From your activity
											</span>
										)}
									</div>
									<p className="atlas-rec__reason">
										Matches {CHIPS.filter(([, key]) => c[key]).length} of {CHIPS.length} thesis dimensions{c.match_activity ? ' · in line with your recent activity' : ''}.
									</p>
								</div>

								<div className="atlas-rec__actions">
									<button type="button" className="atlas-rec__dismiss" onClick={() => setDismissed([...dismissed, c.id])}>Not relevant</button>
									<SaveToWatchlist companyId={c.id} companyName={c.name} />
									<Link className="atlas-action" href={companyHref(c.slug ?? c.id)} data-tour={i === 0 ? 'scout-open-company' : undefined}>
										<span className="atlas-action__icon"><ArrowUpRight /></span>View company
									</Link>
								</div>
							</article>
						))}
					</div>
				)}
		</>
	);
}
