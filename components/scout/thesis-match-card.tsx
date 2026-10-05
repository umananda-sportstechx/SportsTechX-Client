'use client';

import Link from 'next/link';
import { PlaceholderTag } from '@/components/atlas';
import { useThesis, thesisTags } from './use-thesis';

/**
 * "Scout · Thesis match" card for the company profile rail. Backend Not
 * Connected: shows the thesis it would be scored against, without a score.
 */
export function ThesisMatchCard() {
	const [thesis] = useThesis();
	return (
		<section className="atlas-card atlas-co__side scout-match">
			<h2 className="atlas-co__h">Scout · Thesis match</h2>
			<div><PlaceholderTag /></div>
			<p className="atlas-co__sub">Atlas will score this company against your thesis once matching is connected:</p>
			<div className="scout-tags">{thesisTags(thesis).map((t) => <span key={t} className="scout-tag">{t}</span>)}</div>
			<Link href="/scout/thesis" className="scout-link">Edit thesis</Link>
		</section>
	);
}
