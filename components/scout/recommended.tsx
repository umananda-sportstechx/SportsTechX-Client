'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowUpRight, Globe, X } from 'lucide-react';
import { Action, Empty, Loading, Logo, cx } from '@/components/atlas';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { qk } from '@/lib/query-keys';
import { companyHref, hrefOf } from '@/lib/routes';
import { fmtUsd } from '@/components/features/market/format';

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
					<div className="scout-cards">
						{rows.map((c) => (
							<article key={c.id} className="atlas-card scout-co-card">
								<div className="scout-co-card__top">
									<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={44} radius={8} />
									<div className="scout-co-card__id">
										<div className="scout-co-card__name">{c.name}</div>
										<div className="scout-co-card__meta">{place(c) || '—'}</div>
									</div>
								</div>
								{c.description && <p className="scout-co-card__desc">{c.description}</p>}
								<div className="scout-co-card__facts">
									<span>{c.sector ?? '—'}</span>
									<span>
										{fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd))} raised
										{c.latest_round ? ` · ${c.latest_round}` : ''}
									</span>
								</div>
								<div className="scout-why">
									<div className="atlas-eyebrow">Why it matches</div>
									<div className="scout-checks">
										{CHIPS.map(([label, key]) => (
											<span key={label} className={cx('scout-check', c[key] && 'on')}>
												{label} {c[key] ? '✓' : '–'}
											</span>
										))}
									</div>
									<p>Matches {c.match_count} of {CHIPS.length} thesis dimensions.</p>
								</div>
								<div className="scout-co-card__actions">
									<button type="button" className="atlas-action" onClick={() => setDismissed([...dismissed, c.id])}>
										<span className="atlas-action__icon"><X /></span>Not relevant
									</button>
									{c.website && <Action icon={<Globe />} href={c.website} external>Website</Action>}
									<Link className="atlas-action" href={companyHref(c.slug ?? c.id)}>
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
