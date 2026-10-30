import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';

// Re-declare the site template here: a segment's own title stops the root template from reaching
// its children, so each report page reads "<report title> | Atlas" (and this fallback "Report | Atlas").
export const metadata: Metadata = { title: { default: 'Report', template: '%s | Atlas' } };

// Reports read per-user (tier-gated) data — no static pre-render.
export const dynamic = 'force-dynamic';

/**
 * Chrome-less report shell: auth only, NO AppShell (no sidebar/navbar). A
 * ported Intelligence-Hub report is a full-page, self-themed surface with its
 * own sticky nav — the Atlas chrome would clash, so this layout deliberately
 * skips it. Still gated: the edge middleware protects everything outside
 * PUBLIC_PATHS, and ProtectedRoute adds the session check.
 */
export default function ReportLayout({ children }: { children: React.ReactNode }) {
	return <ProtectedRoute>{children}</ProtectedRoute>;
}
