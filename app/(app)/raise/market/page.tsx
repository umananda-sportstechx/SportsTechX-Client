import { redirect } from 'next/navigation';

/** The old tabbed Market page was split across Discover and Intelligence — keep old links (incl. ?tab=) working. */
const TAB_ROUTES: Record<string, string> = {
	companies: '/raise/discover/companies',
	roundup: '/raise/intelligence/roundup',
	mymarket: '/raise/intelligence/my-market',
};

export default async function MarketRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const { tab } = await searchParams;
	redirect(TAB_ROUTES[tab ?? ''] ?? '/raise/intelligence/analytics');
}
