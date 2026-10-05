'use client';

import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { PaywallGate } from '@/components/paywall/paywall-gate';
import { useUserProfile } from '@/hooks/use-user-profile';
import { SCOUT_HOME, SCOUT_ACCOUNT, SCOUT_BOTTOM_NAV, SCOUT_COLOR } from './shell-config';
import { useScoutNav } from './use-scout-nav';
import './scout.css';

/**
 * Atlas Scout investor workspace shell — the shared AtlasShell configured for
 * Scout (nav in shell-config.ts). The onboarding flow renders full-screen,
 * without the sidebar.
 */
export function ScoutShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: profile } = useUserProfile();
	const nav = useScoutNav();
	if (pathname.startsWith('/scout/onboarding')) {
		return <div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}</div>;
	}
	return (
		<>
			<AtlasShell
				product="Scout"
				productColor={SCOUT_COLOR}
				homePath={SCOUT_HOME}
				nav={nav}
				bottomNav={SCOUT_BOTTOM_NAV}
				accountPath={SCOUT_ACCOUNT}
				accountName={profile?.full_name ?? profile?.display_name}
			>
				{children}
			</AtlasShell>
			<PaywallGate />
		</>
	);
}
