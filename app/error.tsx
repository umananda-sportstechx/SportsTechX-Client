'use client';

import '@/components/atlas/styles/tokens.css';
import '@/components/atlas/styles/base.css';
import '@/components/atlas/styles/components.css';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

/**
 * Global error boundary. Catches anything that throws during render outside
 * of a route group's own error.tsx. Lives at app/error.tsx per Next.js 16
 * App Router convention. Must be a client component to use the reset() prop.
 *
 * Like the 404, this is reachable by a logged-out visitor, so the secondary CTA
 * is `/` — `/app` alone would bounce them to a login screen.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// There is no error reporter in this client — Sentry was removed, and the
		// placeholder it left behind was never imported, so it never ran. This
		// console line is the only record a browser crash leaves. If a reporter
		// is ever adopted, this and `app/app/error.tsx` and `global-error.tsx`
		// are the three places it has to be called from.
		console.error('[GlobalError]', error);
	}, [error]);

	return (
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)' }}>
			<div style={{ textAlign: 'center', maxWidth: 440 }}>
				<span style={{
					display: 'grid', placeItems: 'center', width: 44, height: 44, margin: '0 auto 16px',
					borderRadius: 'var(--a-radius-pill)', background: 'var(--a-danger-bg)', color: 'var(--a-danger)',
				}}>
					<AlertTriangle size={22} />
				</span>
				<h1 style={{ margin: 0, fontFamily: 'var(--a-font)', fontSize: 26, fontWeight: 700, color: 'var(--a-ink)' }}>
					Something went wrong
				</h1>
				<p style={{ margin: '10px 0 0', fontFamily: 'var(--a-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>
					An unexpected error stopped this page from rendering. You can try again, or head back.
				</p>
				{error.digest && (
					<p style={{ margin: '12px 0 0', fontFamily: 'var(--a-mono)', fontSize: 11, color: 'var(--a-faint)' }}>
						Reference: {error.digest}
					</p>
				)}
				<div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
					<button type="button" className="atlas-btn atlas-btn--primary" onClick={reset}>Try again</button>
					<Link href="/" className="atlas-btn atlas-btn--outline">Go to homepage</Link>
				</div>
			</div>
		</div>
	);
}
