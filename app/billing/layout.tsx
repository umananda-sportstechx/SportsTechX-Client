import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';

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
 * The plan chooser used to render here, across all three pages, and that was
 * too wide. On `/billing` it walled people out of their own subscription page —
 * including 126 unstamped accounts that are already paying for Raise, who got a
 * full-screen "choose your plan" with their own plan greyed out. On
 * `/billing/success` it covered the post-payment screen with the same wall,
 * Explore marked "Current plan", seconds after someone had paid for Scout.
 *
 * It belongs on `/billing/cancel` alone, which is the case the comment was
 * really describing: an unstamped user who backs out of Stripe lands there with
 * no plan chosen, and the chooser is their way forward. It lives on that page now.
 */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}</div>
		</ProtectedRoute>
	);
}
