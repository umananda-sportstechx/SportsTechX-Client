'use client';

import Link from 'next/link';
import { ArrowUpRight, Bookmark, BookmarkCheck, Globe } from 'lucide-react';
import { Action, Logo, cx } from '@/components/atlas';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { hrefOf } from '@/lib/routes';
import { CHECKS, type SampleCompany } from './sample-data';

/** Pieces shared by Scout's sample-company cards (Recommended, Signals). */

export const sampleCompanyHref = (c: { name: string }) => `${hrefOf('companies')}?q=${encodeURIComponent(c.name)}`;

export function SampleLogo({ c, size = 44 }: { c: Pick<SampleCompany, 'name' | 'site'>; size?: number }) {
	return <Logo co={{ name: c.name, website: c.site, custom_logo_url: null }} size={size} radius={8} />;
}

/** Stage ✓ · Geography ✓ · Sector – · Cheque ✓ */
export function ThesisChecks({ checks }: { checks: SampleCompany['checks'] }) {
	return (
		<div className="scout-checks">
			{CHECKS.map((k, i) => <span key={k} className={cx('scout-check', checks[i] && 'on')}>{k} {checks[i] ? '✓' : '–'}</span>)}
		</div>
	);
}

/** Watch toggle for sample companies (browser-only list, not a real watchlist). */
export function WatchSample({ id }: { id: string }) {
	const [watched, setWatched] = usePlaceholderState<string[]>('watched', ['zenniz', 'playermaker', 'fanwave']);
	const on = watched.includes(id);
	return (
		<button type="button" className={cx('scout-watch', on && 'on')} aria-pressed={on} onClick={() => setWatched((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]))}>
			{on ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}{on ? 'Watching' : 'Watch'}
		</button>
	);
}

export function SampleCompanyLinks({ c }: { c: Pick<SampleCompany, 'name' | 'site'> }) {
	return (
		<>
			<Action icon={<Globe />} href={`https://${c.site}`} external>Website</Action>
			<Link className="atlas-action" href={sampleCompanyHref(c)}><span className="atlas-action__icon"><ArrowUpRight /></span>View company</Link>
		</>
	);
}
