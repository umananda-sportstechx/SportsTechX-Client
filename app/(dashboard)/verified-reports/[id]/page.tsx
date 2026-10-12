'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { VerifiedReport } from '@/components/features/verified-reports/report-view';

/**
 * The destination of the "your verified-company report is ready" email, which
 * has been pointing at this URL since long before the page existed.
 *
 * Not in `lib/routes.ts` on purpose: it is reached from the email, the
 * notification bell and the Get Verified page, never from the sidebar.
 */
export default function Page() {
	const id = useParams<{ id: string }>().id;
	return <Screen><VerifiedReport id={id} /></Screen>;
}
