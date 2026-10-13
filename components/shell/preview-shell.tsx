'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AtlasShell } from '@/components/atlas';
import { PracticeBar } from '@/components/features/walkthrough/practice-bar';
import { usePracticeAccess } from '@/components/features/walkthrough/use-practice-access';
import { SCOUT_COLOR } from '@/components/scout/shell-config';
import { TIER_LABEL } from '@/hooks/use-user-profile';
import { buildNav } from '@/lib/nav';
import { pathOf } from '@/lib/routes';
import type { Tier } from '@/lib/access';
import '@/components/raise/raise.css';
import '@/components/scout/scout.css';
import './preview-shell.css';

const WalkthroughCoach = dynamic(() => import('@/components/features/walkthrough/walkthrough-coach').then((m) => m.WalkthroughCoach), { ssr: false });

const COLOR: Record<Tier, string | undefined> = { explore: undefined, raise: undefined, scout: SCOUT_COLOR };

/**
 * The real app frame (components/shell/app-shell.tsx), minus everything that
 * needs a real signed-in profile: no Navbar (search, account menu, sign out),
 * no RouteGate (entitlement by real tier), no upgrade cards. Walk the Pitch
 * pre-signup (app/preview/) renders the exact same page components and the
 * exact same WalkthroughCoach inside this instead — "the whole app showing",
 * just with a static nav (one product, already known from the URL) and a
 * minimal topbar offering the one real action available: sign up for real.
 */
export function PreviewShell({ product, children }: { product: Tier; children: React.ReactNode }) {
	const { nav } = buildNav(product, false, [], 'nav-list');
	const { inPractice, practice } = usePracticeAccess();
	const coach = inPractice && practice.phase === 'tour' ? <WalkthroughCoach /> : null;

	return (
		<AtlasShell
			product={TIER_LABEL[product]}
			productColor={COLOR[product]}
			homePath={pathOf('home', product)}
			nav={nav}
			topbar={
				<>
					<PracticeBar />
					<div className="wt-preview-bar">
						<span className="wt-preview-bar__tag">Preview — not your real account</span>
						<Link className="wt-preview-bar__cta" href="/signup">Sign up for real</Link>
					</div>
				</>
			}
			forceCollapsed={inPractice}
			overlay={coach}
		>
			{children}
		</AtlasShell>
	);
}
