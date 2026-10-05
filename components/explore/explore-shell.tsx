'use client';

import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';
import { EXPLORE_HOME, EXPLORE_ACCOUNT, EXPLORE_BOTTOM_NAV, EXPLORE_COLOR, EXPLORE_NAV } from './shell-config';
import { UpgradeCards } from './upgrade-cards';
import './explore.css';

/**
 * Atlas Explore shell — the shared AtlasShell configured for Explore, with the
 * Raise / Scout upgrade cards in the sidebar. Onboarding renders full-screen.
 * Open to every signed-in user (Explore is the base product).
 */
export function ExploreShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: profile } = useUserProfile();
	if (pathname.startsWith('/explore/onboarding')) {
		return <div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}</div>;
	}
	return (
		<AtlasShell
			product="Explore"
			productColor={EXPLORE_COLOR}
			homePath={EXPLORE_HOME}
			nav={EXPLORE_NAV}
			bottomNav={EXPLORE_BOTTOM_NAV}
			accountPath={EXPLORE_ACCOUNT}
			accountName={profile?.full_name ?? profile?.display_name}
			railExtra={<UpgradeCards />}
		>
			{children}
		</AtlasShell>
	);
}
