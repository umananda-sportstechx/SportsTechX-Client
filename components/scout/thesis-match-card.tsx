'use client';

import Link from 'next/link';
import { useThesis, thesisTags } from './use-thesis';
import { hrefOf } from '@/lib/routes';

/**
 * "Scout · Thesis match" card for the company profile rail.
 *
 * Shows the thesis Atlas ranks against, not a score for this company — that
 * per-company number isn't built. This used to carry a `<PlaceholderTag />`
 * reading "Backend Not Connected (Placeholders)", which was both wrong (the
 * thesis is stored on the account and `GET /scout/recommended` really does match
 * against it) and alarming on a paying user's screen. The limitation is in the
 * copy instead.
 */
export function ThesisMatchCard() {
	const [thesis] = useThesis();
	return (
		<section className="atlas-card atlas-co__side scout-match">
			<h2 className="atlas-co__h">Scout · Thesis match</h2>
			<p className="atlas-co__sub">Atlas ranks companies, signals and Deal Flow against this thesis. A match score for this company specifically isn’t shown here yet.</p>
			<div className="scout-tags">{thesisTags(thesis).map((t) => <span key={t} className="scout-tag">{t}</span>)}</div>
			<Link href={hrefOf('thesis')} className="scout-link">Edit thesis</Link>
		</section>
	);
}
