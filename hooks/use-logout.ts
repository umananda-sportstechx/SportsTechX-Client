'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { track, Events } from '@/lib/analytics';

/**
 * Signing out, in one place.
 *
 * This lived inline in `components/features/account/account-settings.tsx` and was
 * the only way out of the product — you had to navigate to /account first. The
 * navbar's account menu now offers it too, so the implementation moved here
 * rather than being copied and left to drift.
 *
 * `signingOut` stays true on the success path on purpose: the redirect to /login
 * is what ends this component's life, and flipping the button back to "Log out"
 * mid-navigation just invites a second click. It is only reset on failure.
 */
export function useLogout(): { logout: () => Promise<void>; signingOut: boolean } {
	const router = useRouter();
	const [signingOut, setSigningOut] = useState(false);

	const logout = async () => {
		if (signingOut) return;
		setSigningOut(true);
		try {
			track(Events.signedOut);
			await getSupabaseBrowser().auth.signOut();
			router.push('/login');
		} catch { setSigningOut(false); }
	};

	return { logout, signingOut };
}
