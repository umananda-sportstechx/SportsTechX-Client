'use client';

import { useParams } from 'next/navigation';
import { Screen, SectionHeader } from '@/components/atlas';
import { RecommendedInvestors } from '@/components/raise/investors';
import { Recommended } from '@/components/scout/recommended';

/** Preview's `/recommended` — investors matched to Raise, or companies matched to Scout, by the `[product]` URL segment instead of a real tier. */
export default function Page() {
	const { product } = useParams<{ product: string }>();
	return (
		<Screen>
			<SectionHeader />
			{product === 'scout' ? <Recommended /> : <RecommendedInvestors />}
		</Screen>
	);
}
