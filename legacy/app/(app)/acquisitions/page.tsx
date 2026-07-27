'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * The standalone Acquisitions list was consolidated into the richer M&A Tracker
 * (`/ma`), which is the canonical, design-aligned acquisitions list (stat strip,
 * quarterly chart, acquiree/acquirer/deal filter rail). This route redirects
 * there, preserving any query string. The acquisition detail route
 * (`/acquisitions/[id]`) is unaffected.
 */
export default function AcquisitionsRedirect() {
	const router = useRouter();
	const params = useSearchParams();
	useEffect(() => {
		const qs = params.toString();
		router.replace(qs ? `/ma?${qs}` : '/ma');
	}, [router, params]);
	return null;
}
