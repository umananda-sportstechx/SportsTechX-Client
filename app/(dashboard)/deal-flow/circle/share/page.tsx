'use client';

import { useSearchParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { ShareDeal } from '@/components/scout/share-deal';

/**
 * From the Circle → Share a deal.
 *
 * `?draft=<id>` reopens an existing submission — a draft, or one the review
 * team returned with changes requested. Without it the wizard starts blank.
 */
export default function ScoutShareDealPage() {
	const draft = useSearchParams().get('draft');
	return <Screen><ShareDeal resumeId={draft ?? undefined} /></Screen>;
}
