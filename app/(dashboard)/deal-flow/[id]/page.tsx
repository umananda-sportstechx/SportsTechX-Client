'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { DealDetail } from '@/components/scout/deal-detail';

/** Deal Flow → one opportunity (Backend Not Connected). */
export default function ScoutDealPage() {
	return <Screen><DealDetail id={String(useParams().id)} /></Screen>;
}
