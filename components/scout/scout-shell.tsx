'use client';

import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useNav } from '@/hooks/use-nav';
import { PaywallGate } from '@/components/paywall/paywall-gate';
import { SCOUT_COLOR } from './shell-config';
import './scout.css';

/**
 * Atlas Scout shell — the shared AtlasShell on the Scout nav. Onboarding
 * renders full-screen. Nav comes from the route manifest via `useNav()`.
 */
export function ScoutShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: profile } = useUserProfile();
	const { nav, bottomNav, homePath, accountPath } = useNav();
	if (pathname.startsWith('/scout/onboarding')) {
		return <div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}</div>;
	}
	return (
		<>
			<AtlasShell
				product="Scout"
				productColor={SCOUT_COLOR}
				homePath={homePath}
				nav={nav}
				bottomNav={bottomNav}
				accountPath={accountPath}
				accountName={profile?.full_name ?? profile?.display_name}
			>
				{children}
			</AtlasShell>
			<PaywallGate />
		</>
	);
}
