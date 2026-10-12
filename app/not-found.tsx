// tokens + base + components, not the Atlas barrel: these pages need the
// button and type styles but not the chart sheet, and a 404 is served to
// crawlers. AtlasLogo is imported from its own file (inline SVG, inherits
// currentColor) rather than the barrel, so it stays just as light.
import '@/components/atlas/styles/tokens.css';
import '@/components/atlas/styles/base.css';
import '@/components/atlas/styles/components.css';
import Link from 'next/link';
import { AtlasLogo } from '@/components/atlas/brand/atlas-logo';

/**
 * 404 — the only perimeter page a visitor reaches *by accident*, including
 * logged-out strangers and crawlers.
 *
 * Two CTAs on purpose: `/` works for everyone (the public landing page), while
 * `/home` is bounced to `/login` by the edge for anyone without a session — so
 * a stranger's mistyped URL still has a door that opens.
 */
export default function NotFound() {
	return (
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)' }}>
			<div style={{ textAlign: 'center', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
				{/* Brand lockup — the Atlas wordmark + byline, same as the auth screens. */}
				<div style={{ display: 'flex', alignItems: 'baseline', gap: 9, color: 'var(--a-ink)', marginBottom: 44 }}>
					<AtlasLogo height={30} />
					<span style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--a-faint)' }}>by SportsTechX</span>
				</div>

				{/* Oversized, faint 404 as the visual anchor; the heading overlaps its foot. */}
				<div aria-hidden="true" style={{ fontFamily: 'var(--a-font)', fontSize: 'clamp(104px, 22vw, 188px)', fontWeight: 700, lineHeight: 0.85, letterSpacing: '-0.04em', color: 'var(--a-ink)', opacity: 0.08, userSelect: 'none' }}>
					404
				</div>

				<h1 style={{ margin: '-14px 0 0', fontFamily: 'var(--a-font)', fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: 'var(--a-ink)' }}>
					Page not found
				</h1>
				<p style={{ margin: '12px 0 0', fontFamily: 'var(--a-body)', fontSize: 14, lineHeight: 1.55, color: 'var(--a-muted)', maxWidth: 380 }}>
					The page you&apos;re looking for doesn&apos;t exist or has been moved.
				</p>

				<div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
					<Link href="/" className="atlas-btn atlas-btn--primary">Go to homepage</Link>
					<Link href="/home" className="atlas-btn atlas-btn--outline">Your workspace</Link>
				</div>
			</div>
		</div>
	);
}
