'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { SAMPLE_COMPANIES, sampleCompany } from './sample-data';
import { SampleLogo, ThesisChecks, WatchSample, SampleCompanyLinks } from './sample-company-bits';
import { hrefOf } from '@/lib/routes';

/**
 * Discover → Recommended (Claude Design "Recommended for you") — companies
 * ranked against the investor thesis, with "Why it matches" and "Not relevant".
 * Backend Not Connected: no endpoint scores companies against an investor thesis yet.
 */
export function Recommended() {
	const [dismissed, setDismissed] = usePlaceholderState<string[]>('dismissed-recs', []);
	const rows = SAMPLE_COMPANIES.filter((c) => !dismissed.includes(c.id));
	const last = dismissed[dismissed.length - 1];

	return (
		<>
			<div className="scout-subhead">
				<div><h2 className="atlas-h2">Recommended for you</h2><p className="scout-muted">Companies matching your investment thesis.</p></div>
				<Link href={hrefOf('thesis')} className="scout-link">Edit thesis</Link>
			</div>
			{last && (
				<div className="scout-undo">
					<span>{sampleCompany(last)?.name ?? 'Company'} marked not relevant{dismissed.length > 1 ? ` (+${dismissed.length - 1} more)` : ''}.</span>
					<button type="button" className="scout-link" onClick={() => setDismissed(dismissed.slice(0, -1))}>Undo</button>
				</div>
			)}
			<div className="scout-cards">
				{rows.map((c) => (
					<article key={c.id} className="atlas-card scout-co-card">
						<div className="scout-co-card__top">
							<SampleLogo c={c} />
							<div className="scout-co-card__id">
								<div className="scout-co-card__name">{c.name}</div>
								<div className="scout-co-card__meta">{c.hq} · Founded {c.founded}</div>
							</div>
							<WatchSample id={c.id} />
						</div>
						<p className="scout-co-card__desc">{c.desc}</p>
						<div className="scout-co-card__facts"><span>{c.sub}</span><span>{c.raised} raised · {c.stage}</span></div>
						<div className="scout-why">
							<div className="atlas-eyebrow">Why it matches</div>
							<ThesisChecks checks={c.checks} />
							<p>{c.reason}</p>
						</div>
						<div className="scout-co-card__actions">
							<button type="button" className="atlas-action" onClick={() => setDismissed([...dismissed, c.id])}><span className="atlas-action__icon"><X /></span>Not relevant</button>
							<SampleCompanyLinks c={c} />
						</div>
					</article>
				))}
			</div>
		</>
	);
}
