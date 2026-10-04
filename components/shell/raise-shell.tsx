'use client';

import { usePathname } from 'next/navigation';
import { AtlasShell } from '@/components/atlas';
import { RaiseChat } from '@/components/raise/chat/raise-chat';
import { RAISE_HOME, RAISE_ACCOUNT, RAISE_BOTTOM_NAV } from '@/components/raise/shell-config';
import { useRaiseNav } from '@/components/raise/use-raise-nav';
import { useUserProfile } from '@/hooks/use-user-profile';
import '@/components/raise/raise.css';

/**
 * Atlas Raise founder workspace shell — the shared AtlasShell configured for
 * Raise (nav in components/raise/shell-config.ts) plus the floating co-pilot.
 * Rendered by AppShell for `/raise` routes.
 */
export function RaiseShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: profile } = useUserProfile();
	const nav = useRaiseNav();
	return (
		<AtlasShell
			product="Raise"
			homePath={RAISE_HOME}
			nav={nav}
			bottomNav={RAISE_BOTTOM_NAV}
			accountPath={RAISE_ACCOUNT}
			accountName={profile?.full_name ?? profile?.display_name}
			// The full chat page is itself the co-pilot — don't show the FAB drawer there.
			overlay={pathname.startsWith('/raise/chat') ? null : <RaiseChat />}
		>
			{children}
		</AtlasShell>
	);
}
