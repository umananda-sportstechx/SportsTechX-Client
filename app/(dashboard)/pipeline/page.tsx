'use client';

import { InvestorBoard } from '@/components/raise/investor-board';

/** Raise → Main watchlist: investors not filed in a named investor list. */
export default function Page() {
	return <InvestorBoard listId="main" />;
}
