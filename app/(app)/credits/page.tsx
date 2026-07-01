import { redirect } from 'next/navigation';

/**
 * Credits were merged into the Subscriptions & Purchases page (plans, top-up
 * packs, balances, and credit activity all live there now). Keep this route as
 * a redirect so old links and the "out of credits" deep-link still resolve.
 */
export default function CreditsRedirect() {
	redirect('/subscriptions');
}
