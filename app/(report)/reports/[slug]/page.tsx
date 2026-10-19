import { ReportView } from '@/components/features/reports/report-view';

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	return <ReportView slug={slug} />;
}
