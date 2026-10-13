'use client';

import { useParams } from 'next/navigation';
import { RaiseHome } from '@/components/raise/raise-home';
import { ScoutHome } from '@/components/scout/scout-home';

/**
 * Preview's `/home` — the real home/page.tsx picks Raise/Scout/Explore by the
 * signed-in profile's tier; here there is no profile, so the `[product]` URL
 * segment (set once by app/preview/[product]/layout.tsx) stands in for it.
 */
export default function Page() {
	const { product } = useParams<{ product: string }>();
	return product === 'scout' ? <ScoutHome /> : <RaiseHome />;
}
