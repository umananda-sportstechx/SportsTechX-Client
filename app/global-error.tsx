'use client';

import '@/components/atlas/styles/tokens.css';
import '@/components/atlas/styles/base.css';
import '@/components/atlas/styles/components.css';
import { useEffect } from 'react';

/**
 * Last-resort error boundary.
 *
 * `app/error.tsx` does NOT catch throws from the root `app/layout.tsx` or from
 * `app/providers.tsx` — and providers mounts eight nested context providers plus
 * `AppInit`. Anything that throws while those mount escapes every other boundary
 * in the app. Without this file the user gets Next's unstyled default error
 * page, which is the one screen in the product that looks like a server fault.
 *
 * It replaces the root layout when it renders, so it has to supply its own
 * `<html>` and `<body>` — that is a framework requirement, not a style choice.
 * For the same reason it cannot use anything from the provider tree: no theme,
 * no router, no SWR. Hence the hard-coded reload rather than a `<Link>`, and
 * styles limited to the three Atlas sheets it imports directly.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// No reporter in this client (see app/error.tsx). This console line is the
		// only trace a root-level crash leaves.
		console.error('[GlobalError:root]', error);
	}, [error]);

	return (
		<html lang="en">
			<body>
				<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)' }}>
					<div style={{ textAlign: 'center', maxWidth: 440 }}>
						<div style={{ fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--a-faint)' }}>
							APPLICATION ERROR
						</div>
						<h1 style={{ margin: '14px 0 0', fontFamily: 'var(--a-font)', fontSize: 28, fontWeight: 700, color: 'var(--a-ink)' }}>
							Atlas failed to start
						</h1>
						<p style={{ margin: '10px 0 0', fontFamily: 'var(--a-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>
							Something went wrong before the app could load. Reloading usually fixes it.
						</p>
						{error.digest && (
							<p style={{ margin: '12px 0 0', fontFamily: 'var(--a-mono)', fontSize: 11, color: 'var(--a-faint)' }}>
								Reference: {error.digest}
							</p>
						)}
						<div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
							<button type="button" className="atlas-btn atlas-btn--primary" onClick={reset}>Try again</button>
							{/* A real <a>, not next/link, on purpose: after a root-level crash
							    the React tree is broken, so a soft navigation would try to reuse
							    it. A full document load is the recovery. */}
							{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
							<a href="/" className="atlas-btn atlas-btn--outline">Go to homepage</a>
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
