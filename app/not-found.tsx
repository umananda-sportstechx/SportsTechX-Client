// tokens + base + components, not the Atlas barrel: these pages need the
// button and type styles but not the chart sheet, and a 404 is served to
// crawlers.
import '@/components/atlas/styles/tokens.css';
import '@/components/atlas/styles/base.css';
import '@/components/atlas/styles/components.css';
import Link from 'next/link';

/**
 * 404 — the only perimeter page a visitor reaches *by accident*, including
 * logged-out strangers and crawlers.
 *
 * Two CTAs on purpose. This used to offer only "Go to your workspace" → `/app`,
 * which the edge middleware bounces to `/login` for anyone without a session —
 * so a stranger's mistyped URL dead-ended at a login wall. `/` works for
 * everyone and is the public landing page.
 */
export default function NotFound() {
	return (
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)' }}>
			<div style={{ textAlign: 'center', maxWidth: 420 }}>
				<div style={{ fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--a-faint)' }}>ERROR 404</div>
				<h1 style={{ margin: '14px 0 0', fontFamily: 'var(--a-font)', fontSize: 30, fontWeight: 700, color: 'var(--a-ink)' }}>
					Page not found
				</h1>
				<p style={{ margin: '10px 0 0', fontFamily: 'var(--a-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>
					The page you&apos;re looking for doesn&apos;t exist or has been moved.
				</p>
				<div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
					<Link href="/" className="atlas-btn atlas-btn--primary">Go to homepage</Link>
					<Link href="/app" className="atlas-btn atlas-btn--outline">Your workspace</Link>
				</div>
			</div>
		</div>
	);
}
