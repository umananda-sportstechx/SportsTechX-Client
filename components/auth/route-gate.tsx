'use client';

import { notFound, usePathname } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { TierGate } from '@/components/features/tier-gate/tier-gate';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { access, upgradeTarget } from '@/lib/access';
import { routeForPath } from '@/lib/routes';

/**
 * Decides what a signed-in user sees for the page they opened.
 *
 * Replaces the path sniff in `app-shell.tsx`, which tested
 * `getUserType(profile) === 'raise'` and sent everyone else to `/coming-soon`
 * — a dead end whose only action is sign-out. That rule could not express the
 * one that matters: Raise and Scout are sibling products, so a free user is a
 * prospect (show the pitch) while the other paid tier is not (404).
 *
 * `ProtectedRoute` still owns authentication; this only answers entitlement.
 */
export function RouteGate({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: profile, isLoading } = useUserProfile();
	const tier = getUserType(profile);
	const route = routeForPath(pathname ?? '', tier);

	// Render nothing until the tier is known. Guessing here would flash the
	// upsell at a paying user, which is worse than a beat of blank.
	if (isLoading || !profile) return null;

	switch (access(route?.tier, tier, profile.user_role === 'admin')) {
		case 'allow':
			return <>{children}</>;
		case 'upsell': {
			// `upgradeTarget` rather than reading `route.tier` directly: a screen
			// both products include carries a list, and the gate describes one
			// product. It can only be null if `access` disagreed with itself.
			const sell = upgradeTarget(route?.tier, tier);
			if (!sell || sell === 'explore') return <>{children}</>;
			return (
				<Screen>
					<TierGate tier={sell} feature={typeof route!.name === 'string' ? route!.name : undefined} />
				</Screen>
			);
		}
		case 'hidden':
			// The other paid product. Not a sale we can make, and not a page they
			// should know exists.
			notFound();
	}
}
