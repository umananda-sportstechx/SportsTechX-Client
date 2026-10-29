'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loading, Screen } from '@/components/atlas';
import { AuthBrand } from '@/components/auth/auth-shell';
import { Plans } from '@/components/features/plans/plans';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile } from '@/hooks/use-user-profile';

/**
 * Every tier side by side, for everyone — signed out it is the pricing page,
 * signed in it also tags the viewer's current plan.
 *
 * It is also the post-signup paywall: signup, the email-confirm link and the
 * OAuth callback all land a new account on `/plans?welcome=1`. That shows the
 * one-time plan choice (Explore / paid / "maybe later") until it is answered
 * (`paywall_shown_at`); after that the same URL is just this page. Nothing here
 * ever redirects on its own — only the user's choice moves them on.
 */
function PlansView() {
	const router = useRouter();
	const welcome = useSearchParams().has('welcome');
	const { sessionValid, loading: authLoading } = useAuthSession();
	const { data: profile, isLoading: profileLoading } = useUserProfile();
	const onboarding = welcome && sessionValid && !!profile && !profile.paywall_shown_at;
	// Don't flash the normal page before we know it's the paywall.
	const deciding = welcome && (authLoading || (sessionValid && profileLoading));

	return (
		<Screen>
			<Link href={sessionValid ? '/home' : '/'} className="plans-brand" aria-label="Atlas home">
				<AuthBrand />
			</Link>
			{deciding ? <Loading /> : <Plans onboarding={onboarding ? { onDone: () => router.replace('/home') } : undefined} />}
		</Screen>
	);
}

export default function PlansPage() {
	return <Suspense fallback={<Loading />}><PlansView /></Suspense>;
}
