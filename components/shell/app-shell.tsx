'use client';

import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { RouteGate } from '@/components/auth/route-gate';
import { PaywallGate } from '@/components/paywall/paywall-gate';
import { RaiseChat } from '@/components/raise/chat/raise-chat';
import { UpgradeCards } from '@/components/explore/upgrade-cards';
import { EXPLORE_COLOR } from '@/components/explore/shell-config';
import { SCOUT_COLOR } from '@/components/scout/shell-config';
import { useNav } from '@/hooks/use-nav';
import { useUserProfile } from '@/hooks/use-user-profile';
import { TIER_LABEL } from '@/hooks/use-user-profile';
import type { Tier } from '@/lib/access';
import { hrefOf } from '@/lib/routes';
import '@/components/raise/raise.css';
import '@/components/explore/explore.css';
import '@/components/scout/scout.css';

/**
 * The one app frame, for every product.
 *
 * Replaces `RaiseShell` / `ExploreShell` / `ScoutShell`, which after the nav
 * was derived from the route manifest differed only in these four values —
 * all of which follow from the viewer's tier, not from which route tree they
 * happened to be in.
 *
 * `product` stays per-tier rather than becoming a constant: `AtlasShell` seeds
 * `stx:<product>-rail-collapsed` and `stx:<product>-nav-closed` from it, so
 * flattening it would silently reset everyone's sidebar preferences.
 *
 * It no longer sniffs paths. The two branches it had — billing/coming-soon and
 * onboarding, both wanting the Atlas palette with no chrome — are route
 * *layouts* now (`app/billing/layout.tsx`, `app/(onboarding)/layout.tsx`),
 * which is where "this page has different chrome" belongs. `/coming-soon` is
 * gone entirely.
 */
const COLOR: Record<Tier, string | undefined> = {
	explore: EXPLORE_COLOR,
	// Raise has no colour of its own — AtlasShell's default is the Raise blue.
	raise: undefined,
	scout: SCOUT_COLOR,
};

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname() ?? '';
	const { data: profile } = useUserProfile();
	const { tier, nav, bottomNav, homePath, accountPath } = useNav();

	return (
		<>
			<AtlasShell
				product={TIER_LABEL[tier]}
				productColor={COLOR[tier]}
				homePath={homePath}
				nav={nav}
				bottomNav={bottomNav}
				accountPath={accountPath}
				accountName={profile?.full_name ?? profile?.display_name}
				// Explore's sidebar carries the Raise / Scout upgrade cards.
				railExtra={tier === 'explore' ? <UpgradeCards /> : undefined}
				// Raise's co-pilot FAB. The full chat page is itself the co-pilot,
				// so don't stack a drawer on top of it there.
				overlay={tier === 'raise' && !pathname.startsWith(hrefOf('chat')) ? <RaiseChat /> : undefined}
			>
				<RouteGate>{children}</RouteGate>
			</AtlasShell>
			{/* Keeps today's behaviour: the one-time plan chooser is shown to the
			    paid tiers, not to Explore. It self-suppresses once
			    `paywall_shown_at` is stamped. */}
			{tier !== 'explore' && <PaywallGate />}
		</>
	);
}
