'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { CompanyProfile } from '@/components/features/company/company-profile';

const LIST = '/explore/market/companies';

/** Market → Companies → one company's profile (shared CompanyProfile). */
export default function ExploreCompanyPage() {
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
			/>
		</Screen>
	);
}
