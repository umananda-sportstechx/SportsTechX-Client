'use client';

import Link from 'next/link';
import { useState } from 'react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { Empty, Loading, Logo, cx } from '@/components/atlas';
import { Combobox } from '@/components/atlas/ui/combobox';
import { useWatchlistCompanies } from '@/components/features/watchlists/use-company-watchlists';
import { apiRequest } from '@/lib/query-client';
import { refreshPaths } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';
import { BOARD_STAGES, type BoardStage } from './sample-data';
import { companyHref, hrefOf } from '@/lib/routes';

const STAGE_TO_API: Record<BoardStage, string> = {
	'Identified': 'identified', 'Reviewing': 'reviewing', 'Meeting': 'meeting',
	'Due Diligence': 'due_diligence', 'Passed': 'passed', 'Invested': 'invested',
};
const API_TO_STAGE: Record<string, BoardStage> = Object.fromEntries(
	Object.entries(STAGE_TO_API).map(([k, v]) => [v, k as BoardStage]),
) as Record<string, BoardStage>;

export function WatchlistBoard({ id }: { id: string }) {
	const { companies, isLoading } = useWatchlistCompanies(id);
	const [dragging, setDragging] = useState<string | null>(null);
	const [over, setOver] = useState<BoardStage | null>(null);
	const stageOf = (c: { id: string; stage?: string | null }): BoardStage =>
		(c.stage ? API_TO_STAGE[c.stage] : null) ?? 'Identified';
	// A refused move (e.g. 403 SCOUT_NOT_SET_UP) throws; it used to be an
	// unhandled rejection that snapped the card back with no word why.
	// Optimistic: the card lands in its new column at once (it used to snap back
	// until the round trip finished); the refetch after puts the truth back on a
	// failure. Moving to or from "Passed" changes Scout's recommendations too.
	const move = async (cid: string, s: BoardStage) => {
		const key = qk.userWatchlists.companies(id);
		void mutate(key, (d?: { data: Array<{ id: string; stage?: string | null }> }) =>
			d && { ...d, data: d.data.map((c) => (c.id === cid ? { ...c, stage: STAGE_TO_API[s] } : c)) }, { revalidate: false });
		try {
			const res = await apiRequest('PATCH', `/api/scout/watchlists/${id}/companies/${cid}/stage`, { stage: STAGE_TO_API[s] });
			if (!res.ok) throw new Error(String(res.status));
		} catch {
			toast.error("Couldn't move that company. Please try again.");
		}
		void mutate(key);
		void refreshPaths('/api/scout/recommended');
	};

	if (isLoading) return <Loading />;
	return (
		<>
			{companies.length === 0 ? <Empty>No companies yet. <a href={hrefOf('companies')} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Browse companies</a> and use &quot;Add to watchlist&quot;.</Empty> : (
				<div className="scout-board">
					{BOARD_STAGES.map((s) => {
						const cards = companies.filter((c) => stageOf(c) === s);
						return (
							<section
								key={s}
								className={cx('scout-board__col', over === s && 'is-over')}
								onDragOver={(e) => { e.preventDefault(); setOver(s); }}
								onDragLeave={() => setOver((o) => (o === s ? null : o))}
								onDrop={(e) => { e.preventDefault(); if (dragging) void move(dragging, s); setDragging(null); setOver(null); }}
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
										<Combobox className="scout-board__select" ariaLabel={`Stage for ${c.name}`} value={stageOf(c)} onChange={(v) => void move(c.id, v as BoardStage)} options={BOARD_STAGES.map((x) => [x, x] as [string, string])} />
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
