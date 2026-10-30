import type { Metadata } from 'next';

/** The tab shows the report's own title ("<title> | Atlas"); drafts and misses keep "Report". */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	try {
		const r = await fetch(`${process.env.BACKEND_URL}/api/reports/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
		if (r.ok) {
			const report = (await r.json()) as { title?: string | null };
			if (report.title) return { title: report.title };
		}
	} catch { /* fall back to the layout title */ }
	return {};
}

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
