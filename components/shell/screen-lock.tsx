'use client';

import Link from 'next/link';
import {
	ArrowRight, DollarSign, Shield, Wallet, Zap, TrendingUp, Building2, FileText, Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import type { UserType } from '@/hooks/use-user-profile';

/**
 * Full-page tier-gate upsell. Ported pixel-for-pixel from ui_design_3
 * (`app/app.jsx` `ScreenLock` + `styles.css` `.screen-lock*`).
 *
 * Behavior note: unlike the prototype (which flips a demo `plan` in
 * localStorage), the CTAs route to `/subscriptions` — the client's real
 * upgrade surface. The required tier is supplied by the server-driven
 * `useFeatureAccess` matrix, NOT a hardcoded per-screen map, so the gate
 * always reflects actual entitlements.
 */

type LockTier = 'growth' | 'pro';

interface LockCopy {
	title: string;
	icon: LucideIcon;
	lead: string;
	bullets: string[];
}

/** Keyed by the `screen` prop. Copy for funding/mna/investors/programs is
 *  ported verbatim from ui_design_3; analytics/companies/reports added in the
 *  same voice for the screens the client matrix also gates. */
const SCREEN_LOCK_COPY: Record<string, LockCopy> = {
	funding: {
		title: 'Funding Tracker',
		icon: DollarSign,
		lead: 'Track every funding round in sports-tech — by stage, sector, geography and investor.',
		bullets: [
			'Live feed of 4,800+ rounds across 87 countries',
			'Filter by round stage, amount, sector, investor',
			'Quarterly capital-flow charts + investor co-investment graph',
			'Export to CSV · email digests · API access',
		],
	},
	mna: {
		title: 'M&A Tracker',
		icon: Shield,
		lead: 'Every acquisition in the industry, from strategic deals to PE roll-ups.',
		bullets: [
			'596 acquisitions tracked since 2016',
			'Disclosed valuations + revenue multiples',
			'Acquirer profiles and serial-buyer leaderboards',
			'Filter by deal type, value range, target sector',
		],
	},
	investors: {
		title: 'Investors',
		icon: Wallet,
		lead: 'The active capital landscape — funds, CVCs, accelerators and family offices.',
		bullets: [
			'1,260 active sports-tech investors profiled',
			'Cheque size, focus area, recent activity per firm',
			'Co-investment networks and portfolio overlap',
		],
	},
	programs: {
		title: 'Programs',
		icon: Zap,
		lead: 'Accelerators, incubators and federations shaping the next generation of founders.',
		bullets: [
			'Cohort dates, demo days and application windows',
			'Alumni portfolios + outcomes by program',
			'Filter by stage focus, geography, sport vertical',
		],
	},
	analytics: {
		title: 'Analytics',
		icon: TrendingUp,
		lead: 'The full market picture — capital deployed, sector mix and geographic flow over a decade.',
		bullets: [
			'Quarterly capital-deployed and deal-count trends',
			'Sector and sub-sector funding drilldowns',
			'Top funded countries, cities and companies',
			'M&A volume, deal-type splits and largest exits',
		],
	},
	companies: {
		title: 'Companies',
		icon: Building2,
		lead: 'The complete directory of sports-tech companies — verified, enriched and filterable.',
		bullets: [
			'8,000+ companies across every sector and geography',
			'Verified profiles, funding history and contacts',
			'Advanced filters by sector, stage, location and tech',
		],
	},
	reports: {
		title: 'Reports',
		icon: FileText,
		lead: 'Flagship research and market reports from the SportsTechX team.',
		bullets: [
			'33 in-depth reports, refreshed quarterly',
			'Downloadable PDFs + executive summaries',
			'Sector deep-dives and annual industry outlooks',
		],
	},
};

export function ScreenLock({ screen, requiredTier }: { screen: string; requiredTier: LockTier }) {
	const tier = requiredTier;
	const TIER = tier.toUpperCase();
	const TIER_LABEL = tier === 'growth' ? 'Growth' : 'Pro';
	const copy = SCREEN_LOCK_COPY[screen] || {
		title: 'Premium feature',
		icon: Lock,
		lead: 'This area is part of a paid plan.',
		bullets: [],
	};
	const Icon = copy.icon;

	return (
		<div className="page-pad">
			<div className={`screen-lock screen-lock-${tier}`}>
				<div className="screen-lock-side">
					<div className={`screen-lock-badge screen-lock-badge-${tier}`}>
						<svg width="11" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M6 11V8a6 6 0 1 1 12 0v3" stroke="currentColor" strokeWidth="1.8" fill="none" />
							<rect x="4" y="11" width="16" height="11" rx="1.5" fill="currentColor" />
						</svg>
						<span>{TIER}</span>
					</div>
					<div className="screen-lock-eyebrow">{TIER_LABEL} plan · {copy.title}</div>
					<h1 className="screen-lock-title">{copy.title} is part of {TIER_LABEL}.</h1>
					<p className="screen-lock-lead">{copy.lead}</p>
					<ul className="screen-lock-bullets">
						{copy.bullets.map((b, i) => (
							<li key={i}>
								<span className="screen-lock-tick">
									<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
										<path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
								{b}
							</li>
						))}
					</ul>
					<div className="screen-lock-actions">
						<Link href="/subscriptions" className="btn screen-lock-cta">
							Upgrade to {TIER_LABEL}
							<ArrowRight size={13} />
						</Link>
						<Link href="/subscriptions" className="btn ghost">Compare plans</Link>
					</div>
					<div className="screen-lock-meta">
						14-day free trial · cancel anytime · per-seat billing
					</div>
				</div>
				<div className="screen-lock-preview" aria-hidden="true">
					<div className="screen-lock-preview-glow" />
					<div className="screen-lock-preview-icon">
						<Icon size={56} />
					</div>
					<div className="screen-lock-preview-grid">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="screen-lock-preview-row" style={{ opacity: 1 - i * 0.12 }}>
								<span className="screen-lock-preview-dot" />
								<span className="screen-lock-preview-bar" style={{ width: `${80 - i * 9}%` }} />
								<span className="screen-lock-preview-num">${220 - i * 32}M</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Wraps a page so its content (and data fetches) only mount when the user has
 * access; otherwise renders the full-page <ScreenLock/> upsell. Place at the
 * page's default export, keeping the data-fetching body in an inner component:
 *
 *   export default function FundingPage() {
 *     return <FeatureGate slug="deals_full" screen="funding"><FundingPageInner/></FeatureGate>;
 *   }
 */
export function FeatureGate({
	slug,
	screen,
	children,
}: {
	slug: string;
	screen: string;
	children: React.ReactNode;
}) {
	const access = useFeatureAccess(slug);
	// While the feature matrix loads, render nothing (brief; avoids a flash of
	// either the locked or unlocked state).
	if (access.isLoading) return null;
	if (access.isLocked) {
		const tier: LockTier = access.requiredTier === 'pro' ? 'pro' : 'growth';
		return <ScreenLock screen={screen} requiredTier={tier} />;
	}
	return <>{children}</>;
}

export type { LockTier, UserType };
