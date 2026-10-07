import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PaywallGate } from '@/components/paywall/paywall-gate';

export const metadata: Metadata = { title: 'Subscription' };

export const dynamic = 'force-dynamic';

/**
 * Billing sits outside `/app`, deliberately.
 *
 * Stripe builds its return URLs server-side as `${appBase}/billing/success` and
 * `/billing/cancel` (`billing.controller.ts`), so moving this path means a
 * coordinated deploy on the live payment path — where a mistake means a customer
 * pays and lands on a 404. It is also a plan-agnostic account surface that an
 * external service redirects *into*, which is a different thing from a product
 * screen.
 *
 * Chrome-less for the same reason it always was: picking or changing a plan is a
 * focused flow, and it has to work for a user whose plan is the thing in
 * question. Having its own layout is what removed `AppShell`'s path sniff for it.
 *
 * `PaywallGate` is here because the sniff used to render it on these pages: an
 * unstamped user who cancels Stripe lands on /billing/cancel still unstamped, and
 * the one-time chooser is what gives them a way forward. Dropping it would have
 * been a silent change to the payment flow.
 */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}<PaywallGate /></div>
		</ProtectedRoute>
	);
}
