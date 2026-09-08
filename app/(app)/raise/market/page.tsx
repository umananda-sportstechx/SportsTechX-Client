'use client';

import { useState } from 'react';
import { Screen, H1, Sub, Tabs } from '@/components/atlas/kit';
import { MarketAnalysis } from '@/components/atlas/market/market-analysis';
import { MarketRoundup } from '@/components/atlas/market/market-roundup';
import { MarketCompanies } from '@/components/atlas/market/market-companies';
import { MyMarket } from '@/components/atlas/market/my-market';
import '@/components/atlas/market/market.css';

/**
 * Atlas Raise — Market. A navigable view of the sports-tech market, rebuilt from
 * the design artifact:
 *   • Analysis        — general market analytics (funding/M&A over time, sectors,
 *                       top companies) from the public /api/analytics endpoints.
 *   • Monthly Roundup — editorial + live deal aggregates for a chosen month.
 *   • Companies       — the full company database (search + filters + drawer).
 *   • My market       — the founder's own TAM/SAM sizing (kept from before).
 */
type Tab = 'analysis' | 'roundup' | 'companies' | 'mymarket';

export default function RaiseMarketPage() {
	const [tab, setTab] = useState<Tab>('analysis');
	return (
		<Screen width={1400}>
			<H1>Market</H1>
			<Sub>A current, navigable view of the sports-tech market.</Sub>
			<div style={{ marginTop: 14 }}>
				<Tabs<Tab>
					tabs={[
						{ key: 'analysis', label: 'Analysis' },
						{ key: 'roundup', label: 'Monthly Roundup' },
						{ key: 'companies', label: 'Companies' },
						{ key: 'mymarket', label: 'My market' },
					]}
					value={tab}
					onChange={setTab}
				/>
			</div>
			<div style={{ marginTop: 22 }}>
				{tab === 'analysis' && <MarketAnalysis />}
				{tab === 'roundup' && <MarketRoundup />}
				{tab === 'companies' && <MarketCompanies />}
				{tab === 'mymarket' && <MyMarket />}
			</div>
		</Screen>
	);
}
