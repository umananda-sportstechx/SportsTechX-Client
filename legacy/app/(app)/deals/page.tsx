'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * The standalone Deals list was consolidated into the richer Funding Tracker
 * (`/funding`), which is the canonical, design-aligned deal list (stat strip,
 * quarterly chart, two-mode filter rail) and now also carries the deal-compare
 * affordance. This route redirects there, preserving any query string so
 * existing deep-links keep working. The deal detail route (`/deals/[id]`) is
 * unaffected.
 */
export default function DealsRedirect() {
	const router = useRouter();
	const params = useSearchParams();
	useEffect(() => {
		const qs = params.toString();
		router.replace(qs ? `/funding?${qs}` : '/funding');
	}, [router, params]);
	return null;
}
