import { redirect } from 'next/navigation';

/** Intelligence → Market was renamed Analytics — keep old links working. */
export default function IntelligenceMarketRedirect() {
	redirect('/raise/intelligence/analytics');
}
