import type { Metadata } from 'next';

// Editor-only preview frames: never indexed. Framing is limited to the admin
// panel by the Content-Security-Policy in next.config.ts.
export const metadata: Metadata = { title: 'Report preview · Atlas', robots: { index: false, follow: false } };

export default function ReportPreviewLayout({ children }: { children: React.ReactNode }) {
	return children;
}
