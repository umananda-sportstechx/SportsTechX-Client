'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { CompanyProfile } from '@/components/features/company/company-profile';
import { ThesisMatchCard } from '@/components/scout/thesis-match-card';
import { companyHref, hrefOf } from '@/lib/routes';
import { track, Events } from '@/lib/analytics';

/** Preview's company profile — Scout's thesis-match rail card, by the `[product]` URL segment instead of a real tier. */
export default function Page() {
	const { product, slug: rawSlug } = useParams<{ product: string; slug: string }>();
	const slug = decodeURIComponent(rawSlug);
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
				railTop={product === 'scout' ? <ThesisMatchCard /> : undefined}
			/>
		</Screen>
	);
}
