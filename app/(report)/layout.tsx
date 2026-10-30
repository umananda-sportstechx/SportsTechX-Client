import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';

export const metadata: Metadata = { title: 'Report' }; // root template appends " | Atlas"

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
