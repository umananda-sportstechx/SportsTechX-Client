'use client';

import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useNav } from '@/hooks/use-nav';
import { EXPLORE_COLOR } from './shell-config';
import { UpgradeCards } from './upgrade-cards';
import './explore.css';

/**
 * Atlas Explore shell — the shared AtlasShell configured for Explore, with the
 * Raise / Scout upgrade cards in the sidebar. Onboarding renders full-screen.
 * Open to every signed-in user (Explore is the base product).
 *
 * The nav now comes from the route manifest via `useNav()` rather than a
 * hand-maintained EXPLORE_NAV array.
 */
export function ExploreShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: profile } = useUserProfile();
	const { nav, bottomNav, homePath, accountPath } = useNav();
	if (pathname.startsWith('/explore/onboarding')) {
		return <div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}</div>;
	}
	return (
		<AtlasShell
			product="Explore"
			productColor={EXPLORE_COLOR}
			homePath={homePath}
			nav={nav}
			bottomNav={bottomNav}
			accountPath={accountPath}
			accountName={profile?.full_name ?? profile?.display_name}
			railExtra={<UpgradeCards />}
		>
			{children}
		</AtlasShell>
	);
}
