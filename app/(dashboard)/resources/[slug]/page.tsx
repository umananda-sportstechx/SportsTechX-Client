'use client';

import { use } from 'react';
import { Screen } from '@/components/atlas';
import { FundraisingGuideItem } from '@/components/raise/fundraising-guide';

/** One Fundraising Guide resource: a guide, template or (tickable) checklist. */
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = use(params);
	return (
		<Screen>
			<FundraisingGuideItem slug={slug} />
		</Screen>
	);
}
