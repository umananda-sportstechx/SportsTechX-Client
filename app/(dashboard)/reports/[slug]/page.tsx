'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { ReportView } from '@/components/features/resources/report-view';

/** Intelligence → Reports → one report. Same page for every tier; the API filters editions by plan. */
export default function Page() {
	const slug = decodeURIComponent(String(useParams<{ slug: string }>().slug));
	return <Screen><ReportView slug={slug} /></Screen>;
}
