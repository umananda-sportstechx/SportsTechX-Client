'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Plans } from '@/components/features/plans/plans';

/**
 * What a new account sees after confirming its email: the plans page, and only
 * the plans page. The chosen plan already encodes the persona — raise → founder,
 * scout → investor, explore → just browsing — so there is no separate
 * "what brings you here?" step (it double-asked for something the plan answers).
 *
 * It shows until the one-time paywall is stamped: choosing Explore / "maybe
 * later" stamps it and goes to the app; a paid plan leaves for Stripe and comes
 * back via `/billing/success`. A user who has already seen the wall (returning,
 * or back from checkout) is sent straight to the app.
 *
 * It sits on this route (no app shell) on purpose — as an overlay over the
 * dashboard it would have ambushed every pre-existing unstamped account.
 */
export default function OnboardingPage() {
	const router = useRouter();
	const { data: profile, mutate: refreshProfile } = useUserProfile();

	// Paywall already handled → nothing to show here; go to the app.
	useEffect(() => {
		if (profile && profile.paywall_shown_at) router.replace('/home');
	}, [profile, router]);

	if (profile && !profile.paywall_shown_at) {
		return (
			<div className="onb-screen">
				<div className="onb-plans">
					<Plans onboarding={{ onDone: () => { void refreshProfile(); router.replace('/home'); } }} />
				</div>
			</div>
		);
	}

	return null;
}
