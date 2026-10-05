'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { CompanyProfile } from '@/components/features/company/company-profile';
import { ThesisMatchCard } from '@/components/scout/thesis-match-card';

const LIST = '/scout/discover/companies';

/** Discover → Companies → one company's profile, with Scout's thesis-match card in the rail. */
export default function ScoutCompanyPage() {
	const slug = decodeURIComponent(String(useParams().slug));
	return (
		<Screen>
			<CompanyProfile
				idOrSlug={slug}
				backHref={LIST}
				companyHref={(s) => `${LIST}/${encodeURIComponent(s)}`}
				listHref={({ sector, sub, subsub }) => {
					const q = new URLSearchParams(Object.entries({ sector, sub, subsub }).filter(([, v]) => v) as [string, string][]);
					return `${LIST}?${q}`;
				}}
				railTop={<ThesisMatchCard />}
			/>
		</Screen>
	);
}
