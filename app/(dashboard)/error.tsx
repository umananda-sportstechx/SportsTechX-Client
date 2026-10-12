'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Authenticated-shell error boundary. Catches errors thrown inside any /app
 * page so the sidebar + header stay rendered and the user can navigate
 * elsewhere instead of bouncing to the global app/error.tsx.
 *
 * This used to cover only the Raise tree — Explore and Scout had no boundary at
 * all, so an error there escaped to the global one and took the shell with it.
 * One tree means one boundary for all three.
 *
 * Styled with the Atlas tokens (not shadcn) so it matches app/error.tsx and the
 * 404 — the shell CSS is already loaded by the layout above it.
 */
export default function AppShellError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error('[AppShellError]', error);
	}, [error]);

	return (
		<div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: 24 }}>
			<div style={{ textAlign: 'center', maxWidth: 440 }}>
				<span style={{
					display: 'grid', placeItems: 'center', width: 44, height: 44, margin: '0 auto 16px',
					borderRadius: 'var(--a-radius-pill)', background: 'var(--a-danger-bg)', color: 'var(--a-danger)',
				}}>
					<AlertTriangle size={22} aria-hidden="true" />
				</span>
				<h1 style={{ margin: 0, fontFamily: 'var(--a-font)', fontSize: 22, fontWeight: 700, color: 'var(--a-ink)' }}>
					Couldn&apos;t load this page
				</h1>
				<p style={{ margin: '10px 0 0', fontFamily: 'var(--a-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>
					{process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error stopped this page from rendering.'}
				</p>
				{error.digest && (
					<p style={{ margin: '12px 0 0', fontFamily: 'var(--a-mono)', fontSize: 11, color: 'var(--a-faint)' }}>
						Reference: {error.digest}
					</p>
				)}
				<div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
					<button type="button" className="atlas-btn atlas-btn--primary" onClick={reset}>
						<RotateCcw size={14} aria-hidden="true" style={{ marginRight: 6 }} />Try again
					</button>
					<Link href="/home" className="atlas-btn atlas-btn--outline">Home</Link>
				</div>
			</div>
		</div>
	);
}
