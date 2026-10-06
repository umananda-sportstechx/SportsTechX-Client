'use client';

import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { RouteGate } from '@/components/auth/route-gate';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useNav } from '@/hooks/use-nav';
import { RaiseChat } from '@/components/raise/chat/raise-chat';
import '@/components/raise/raise.css';

/**
 * Atlas Raise shell — the shared AtlasShell on the Raise nav, plus the co-pilot
 * FAB. Nav comes from the route manifest via `useNav()`.
 */
export function RaiseShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: profile } = useUserProfile();
	const { nav, bottomNav, homePath, accountPath } = useNav();
	return (
		<AtlasShell
			product="Raise"
			homePath={homePath}
			nav={nav}
			bottomNav={bottomNav}
			accountPath={accountPath}
			accountName={profile?.full_name ?? profile?.display_name}
			// The full chat page is itself the co-pilot — don't show the FAB drawer there.
			overlay={pathname.startsWith('/raise/chat') ? null : <RaiseChat />}
		>
			<RouteGate>{children}</RouteGate>
		</AtlasShell>
	);
}
