'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { PracticeBar } from '@/components/features/walkthrough/practice-bar';
import { usePracticeAccess } from '@/components/features/walkthrough/use-practice-access';
import { RouteGate } from '@/components/auth/route-gate';
import { Navbar } from './navbar';
import { RailAccount } from './rail-account';
// Walk the Pitch coach: only Explore users in practice ever load it.
const WalkthroughCoach = dynamic(() => import('@/components/features/walkthrough/walkthrough-coach').then((m) => m.WalkthroughCoach), { ssr: false });
// Raise-only, so a static import here shipped the co-pilot to Explore and
// Scout users who can never open it.
const RaiseChat = dynamic(() => import('@/components/raise/chat/raise-chat').then((m) => m.RaiseChat), { ssr: false });
import { UpgradeCards } from '@/components/explore/upgrade-cards';
import { EXPLORE_COLOR } from '@/components/explore/shell-config';
import { SCOUT_COLOR } from '@/components/scout/shell-config';
import { useNav } from '@/hooks/use-nav';
import { TIER_LABEL } from '@/hooks/use-user-profile';
import type { Tier } from '@/lib/access';
import { hrefOf } from '@/lib/routes';
import { trackPage } from '@/lib/analytics';
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

	// One page-view call for the whole signed-in product. Every /app route
	// renders inside this shell, so this is the single place that covers them
	// without 39 per-page calls to keep in sync. No-ops until
	// NEXT_PUBLIC_MIXPANEL_TOKEN is set.
	useEffect(() => { trackPage(pathname); }, [pathname]);
	const { ready, tier, nav, homePath, accountPath } = useNav();
	// Walk the Pitch: the guided tour's coach, only in its `tour` phase.
	const { inPractice, practice } = usePracticeAccess();
	const coach = inPractice && practice.phase === 'tour' ? <WalkthroughCoach /> : null;
	const chat = !pathname.startsWith(hrefOf('chat')) ? <RaiseChat /> : null;

	return (
		<>
			<AtlasShell
				product={TIER_LABEL[tier]}
				productColor={COLOR[tier]}
				homePath={homePath}
				nav={nav}
				// Breadcrumbs, search, Get Verified and the account menu. Account and
				// the theme toggle used to sit at the foot of the rail; they live in
				// the navbar's menu now, so there is one home for account actions.
				topbar={<><PracticeBar /><Navbar /></>}
				// Avatar, name and log out, pinned to the foot of the rail.
				railAccount={<RailAccount accountPath={accountPath} />}
				// Explore's sidebar carries the Raise / Scout upgrade cards. Held back
				// until the tier is actually known — `getUserType(undefined)` is
				// 'explore', so without this a paying user is shown an upgrade pitch
				// for a beat on every cold load.
				railExtra={ready && tier === 'explore' ? <UpgradeCards /> : undefined}
				// Give the coach panel / practice bar room: collapse the rail for the
				// whole practice session (tour and view-only), without touching the
				// user's own saved rail preference for when they're not in practice.
				forceCollapsed={inPractice}
				// The co-pilot FAB, on every tier. It used to be hidden from Explore
				// because the API refused them; now credits are the only limit, so a
				// free user gets the assistant too and is told when they run out. The
				// full chat page is itself the co-pilot, so don't stack a drawer on
				// top of it there.
				overlay={chat || coach ? <>{chat}{coach}</> : undefined}
			>
				<RouteGate>{children}</RouteGate>
			</AtlasShell>
			{/* The plan chooser is deliberately NOT here any more.
			    It used to read `tier !== 'explore'`, which showed it to everyone
			    EXCEPT the people it exists for — a new account defaults to
			    `explore`, so a new user never saw it while a paying customer got a
			    wall with their own plan greyed out. Dropping the tier test fixed
			    that and broke something worse: 2,769 existing accounts have never
			    been stamped, 126 of them paying for Raise, and every one would have
			    been met by a full-screen "choose your plan" overlay.
			    It now lives on `/onboarding`, which is where the flow actually puts
			    it — right after email confirmation — and which an existing account
			    never passes through again. */}
		</>
	);
}
