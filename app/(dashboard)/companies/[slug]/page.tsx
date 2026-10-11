'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { CompanyProfile } from '@/components/features/company/company-profile';
import { ThesisMatchCard } from '@/components/scout/thesis-match-card';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { companyHref, hrefOf } from '@/lib/routes';
import { track, Events } from '@/lib/analytics';

/**
 * Discover → Companies → one company's profile.
 *
 * Scout gets a thesis-match card at the top of the rail; the other tiers don't.
 * That was a separate page per product before — the only difference between
 * three otherwise identical files.
 */
export default function Page() {
	const slug = decodeURIComponent(String(useParams().slug));
	const { data: profile } = useUserProfile();
	// Activation signal: which companies people actually open.
	useEffect(() => { track(Events.companyOpened, { slug }); }, [slug]);
	const list = hrefOf('companies');
	return (
		<Screen>
			<CompanyProfile
				idOrSlug={slug}
				backHref={list}
				companyHref={companyHref}
				listHref={({ sector, sub, subsub }) => {
					const q = new URLSearchParams(Object.entries({ sector, sub, subsub }).filter(([, v]) => v) as [string, string][]);
					return `${list}?${q}`;
				}}
				railTop={getUserType(profile) === 'scout' ? <ThesisMatchCard /> : undefined}
			/>
		</Screen>
	);
}
