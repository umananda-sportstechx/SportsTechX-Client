'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { apiRequest } from '@/lib/query-client';

/**
 * Post-login plan paywall (Hub Rebrand). Shown once — until `paywall_shown_at`
 * is stamped. NO Stripe: choosing a plan sets the tier + persona directly via
 * POST /api/profiles/plan. Styled in the Atlas mockup palette (navy accent,
 * ink text, cream surface) regardless of app theme, per the wireframes.
 */

// Atlas identity palette (from the mockup SVGs).
const INK = '#1F1E1C', MUTED = '#6B6A64', FAINT = '#9B9A93', BORDER = '#E4E2DB', NAVY = '#1B4C78', SURFACE = '#FFFFFF', PAGE = '#F4F2EC';

type Plan = 'free' | 'general' | 'raise' | 'scout';
interface PlanDef { key: Plan; name: string; price: string; tagline: string; features: string[]; highlight?: boolean }
const PLANS: PlanDef[] = [
	{ key: 'free', name: 'Free', price: '€0', tagline: 'Explore the ecosystem', features: ['Browse the public directory', 'Events & newsletter', 'Basic filters'] },
	{ key: 'general', name: 'General', price: '€500', tagline: 'Full platform access', features: ['Everything in Free', 'Companies, investors & deals directories', 'Advanced filters', 'Market reports'] },
	{ key: 'raise', name: 'Raise', price: '€600', tagline: 'Raise capital like a pro', features: ['Atlas Raise fundraising workspace', 'Investor database + matching', 'AI pitch-deck analysis', 'Pipeline & market sizing', 'Quarterly 1:1 with STX leadership'], highlight: true },
	{ key: 'scout', name: 'Scout', price: '€2,500', tagline: 'Sourcing & dealflow intelligence', features: ['Everything in General', 'Dealflow & M&A intelligence', 'Full contacts + export', 'Deep-dive analytics'] },
];

export function PaywallGate() {
	const { data: profile, mutate } = useUserProfile();
	const [busy, setBusy] = useState<Plan | 'dismiss' | null>(null);

	// Show once: until the wall has been stamped. (Undefined while loading → hidden.)
	if (!profile || profile.paywall_shown_at) return null;

	const choose = async (plan: Plan | null) => {
		setBusy(plan ?? 'dismiss');
		try {
			// Free / dismiss: set the tier directly and close the wall (no payment).
			if (!plan || plan === 'free') {
				await apiRequest('POST', '/api/profiles/plan', plan ? { plan } : {});
				await mutate();
				return;
			}
			// Paid plans: stamp the wall as seen, then hand off to Stripe Checkout.
			// The billing webhook sets the tier on successful payment.
			await apiRequest('POST', '/api/profiles/plan', {});
			const res = await apiRequest('POST', '/api/billing/checkout', { plan });
			if (!res.ok) throw new Error('checkout failed');
			const body = (await res.json()) as { url?: string | null };
			if (body.url) { window.location.assign(body.url); return; }
			setBusy(null);
		} catch { setBusy(null); }
	};

	const current = profile.user_type ?? 'free';
	return (
		<div style={{ position: 'fixed', inset: 0, zIndex: 200, background: PAGE, color: INK, overflowY: 'auto', fontFamily: 'Helvetica, Arial, sans-serif' }}>
			<div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(32px, 6vh, 72px) 24px' }}>
				<div style={{ textAlign: 'center', marginBottom: 40 }}>
					<div style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: NAVY, marginBottom: 12 }}>SportsTechX</div>
					<h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 10px', color: INK }}>Choose your plan</h1>
					<p style={{ fontSize: 15, color: MUTED, margin: 0 }}>Pick the plan that fits how you use SportsTechX. You can change this later.</p>
				</div>

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, alignItems: 'stretch' }}>
					{PLANS.map((p) => {
						const isCurrent = current === p.key;
						return (
							<div key={p.key} style={{
								background: SURFACE, border: `1px solid ${p.highlight ? NAVY : BORDER}`, borderRadius: 14,
								padding: 24, display: 'flex', flexDirection: 'column',
								boxShadow: p.highlight ? '0 8px 30px rgba(27,76,120,0.14)' : 'none', position: 'relative',
							}}>
								{p.highlight && <div style={{ position: 'absolute', top: -11, left: 24, background: NAVY, color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', padding: '3px 10px', borderRadius: 20 }}>Recommended</div>}
								<div style={{ fontSize: 18, fontWeight: 700, color: INK }}>{p.name}</div>
								<div style={{ fontSize: 12, color: FAINT, margin: '2px 0 14px' }}>{p.tagline}</div>
								<div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 18 }}>
									<span style={{ fontSize: 30, fontWeight: 700, color: INK }}>{p.price}</span>
									{p.price.startsWith('€') && p.key !== 'free' && <span style={{ fontSize: 13, color: MUTED }}>/year</span>}
								</div>
								<ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'grid', gap: 9, flex: 1 }}>
									{p.features.map((f) => (
										<li key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: MUTED, lineHeight: 1.4 }}>
											<Check size={15} color={NAVY} style={{ flexShrink: 0, marginTop: 1 }} /> {f}
										</li>
									))}
								</ul>
								<button
									onClick={() => void choose(p.key)}
									disabled={busy !== null || isCurrent}
									style={{
										height: 42, borderRadius: 8, border: p.highlight ? 'none' : `1px solid ${BORDER}`,
										background: isCurrent ? PAGE : p.highlight ? NAVY : SURFACE,
										color: isCurrent ? MUTED : p.highlight ? '#fff' : INK,
										fontSize: 14, fontWeight: 600, cursor: isCurrent ? 'default' : 'pointer',
										display: 'grid', placeItems: 'center',
									}}>
									{busy === p.key ? <Loader2 className="spin" size={15} /> : isCurrent ? 'Current plan' : p.key === 'free' ? 'Continue on Free' : `Choose ${p.name}`}
								</button>
							</div>
						);
					})}
				</div>

				<div style={{ textAlign: 'center', marginTop: 28 }}>
					<button onClick={() => void choose(null)} disabled={busy !== null}
						style={{ background: 'none', border: 0, color: MUTED, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
						{busy === 'dismiss' ? 'Saving…' : 'Maybe later — keep my current plan'}
					</button>
				</div>
			</div>
		</div>
	);
}
