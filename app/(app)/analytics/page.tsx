'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Page, PageTitle } from '@/components/ui/atoms';
import { FeatureGate } from '@/components/shell/screen-lock';
import { OverviewTab } from './overview';
import { MonthlyRoundupTab } from './monthly-roundup';
import { FundingDeepDiveTab } from './funding-deep-dive';
import { MaDeepDiveTab } from './ma-deep-dive';
import { InvestorsTab } from './investors';

/**
 * Analytics with 5 sub-tabs. URL-driven (`?tab=…`). Each sub-tab is a
 * self-contained component that fetches its own data through SWR — no shared
 * state, no shared loading. Switching tabs is instant; SWR dedupes any
 * overlapping queries.
 */

type Tab = 'overview' | 'monthly' | 'funding' | 'mna' | 'investors';

const TABS: Array<{ key: Tab; label: string }> = [
	{ key: 'overview', label: 'Overview' },
	{ key: 'monthly', label: 'Monthly roundup' },
	{ key: 'funding', label: 'Funding deep dive' },
	{ key: 'mna', label: 'M&A deep dive' },
	{ key: 'investors', label: 'Investors' },
];

export default function AnalyticsPage() {
	return (
		<FeatureGate slug="analytics_access" screen="analytics">
			<AnalyticsPageInner />
		</FeatureGate>
	);
}

function AnalyticsPageInner() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const initialTab = (params.get('tab') as Tab) ?? 'overview';
	const [tab, setTab] = useState<Tab>(initialTab);

	useEffect(() => {
		const sp = new URLSearchParams(params.toString());
		if (tab === 'overview') sp.delete('tab'); else sp.set('tab', tab);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab]);

	// Sync tab FROM the URL too, so a deep link (e.g. the chatbot opening
	// ?tab=funding while the user is already on /analytics) switches the tab.
	useEffect(() => {
		const t = (params.get('tab') as Tab) ?? 'overview';
		setTab((cur) => (cur === t ? cur : t));
	}, [params]);

	return (
		<Page>
			<PageTitle
				kicker="Insight · live dashboards"
				title="Analytics"
				sub="Aggregated views across the entire sports-tech ecosystem — capital, deal velocity, sub-sector heat."
			/>

			<nav className="an-tabs" role="tablist">
				{TABS.map((t) => (
					<button
						key={t.key}
						role="tab"
						aria-selected={tab === t.key}
						className={`an-tab ${tab === t.key ? 'on' : ''}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
					</button>
				))}
			</nav>

			{tab === 'overview' && <OverviewTab />}
			{tab === 'monthly' && <MonthlyRoundupTab />}
			{tab === 'funding' && <FundingDeepDiveTab />}
			{tab === 'mna' && <MaDeepDiveTab />}
			{tab === 'investors' && <InvestorsTab />}
		</Page>
	);
}
