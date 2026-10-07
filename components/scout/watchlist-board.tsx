'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Empty, Loading, Logo, cx } from '@/components/atlas';
import { useWatchlistCompanies } from '@/components/features/watchlists/use-company-watchlists';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { BOARD_STAGES, type BoardStage } from './sample-data';
import { companyHref } from '@/lib/routes';

/**
 * Watchlist board view (Claude Design "Board"): the watchlist's real companies
 * in investment-stage columns. Backend Not Connected: watchlists don't store a
 * stage yet, so stages are kept in this browser.
 */
export function WatchlistBoard({ id }: { id: string }) {
	const { companies, isLoading } = useWatchlistCompanies(id);
	const [stages, setStages] = usePlaceholderState<Record<string, BoardStage>>(`board:${id}`, {});
	const [dragging, setDragging] = useState<string | null>(null);
	const [over, setOver] = useState<BoardStage | null>(null);
	const stageOf = (cid: string): BoardStage => stages[cid] ?? 'Identified';
	const move = (cid: string, s: BoardStage) => setStages((prev) => ({ ...prev, [cid]: s }));

	if (isLoading) return <Loading />;
	return (
		<>
			{companies.length === 0 ? <Empty>No companies yet. Open any company and use “Add to watchlist”.</Empty> : (
				<div className="scout-board">
					{BOARD_STAGES.map((s) => {
						const cards = companies.filter((c) => stageOf(c.id) === s);
						return (
							<section
								key={s}
								className={cx('scout-board__col', over === s && 'is-over')}
								onDragOver={(e) => { e.preventDefault(); setOver(s); }}
								onDragLeave={() => setOver((o) => (o === s ? null : o))}
								onDrop={(e) => { e.preventDefault(); if (dragging) move(dragging, s); setDragging(null); setOver(null); }}
								aria-label={`${s}: ${cards.length}`}
							>
								<div className="scout-board__head"><span>{s}</span><span className="scout-board__n">{cards.length}</span></div>
								{cards.map((c) => (
									<article key={c.id} className="scout-board__card" draggable onDragStart={() => setDragging(c.id)} onDragEnd={() => { setDragging(null); setOver(null); }}>
										<div className="scout-board__id">
											<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={26} radius={5} />
											<Link href={companyHref(c.slug ?? c.id)} className="scout-board__name">{c.name}</Link>
										</div>
										<div className="scout-board__meta">{[c.primary_sector, c.hq_country].filter(Boolean).join(' · ')}</div>
										<select className="scout-board__select" aria-label={`Stage for ${c.name}`} value={stageOf(c.id)} onChange={(e) => move(c.id, e.target.value as BoardStage)}>
											{BOARD_STAGES.map((x) => <option key={x} value={x}>{x}</option>)}
										</select>
									</article>
								))}
							</section>
						);
					})}
				</div>
			)}
			<p className="scout-muted scout-board__note">Drag companies between stages. Passed companies stay on record and are excluded from future recommendations.</p>
		</>
	);
}
