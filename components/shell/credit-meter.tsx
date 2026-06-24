'use client';

import Link from 'next/link';
import { Coins } from 'lucide-react';
import { useCreditBalance } from '@/hooks/use-credit-balance';

/**
 * Credit balance + "remaining" progress bar, themed to the design system.
 * Three presentations of the same data:
 *   - 'rail'  : compact row for the sidebar (icon + bar, collapses with the rail)
 *   - 'menu'  : a row inside the profile dropdown
 *   - 'card'  : a settings-page card with a "Get more credits" CTA
 *
 * The bar tracks the monthly pool (monthly_balance / monthly_grant); top-up
 * credits are surfaced as a "+N" note since they don't expire.
 */
export function CreditMeter({ variant }: { variant: 'rail' | 'menu' | 'card' }) {
	const { balance } = useCreditBalance('ai');
	if (!balance) return null;

	const total = balance.total_available;
	const grant = balance.monthly_grant;
	const pct = grant > 0 ? Math.max(0, Math.min(100, Math.round((balance.monthly_balance / grant) * 100))) : 0;
	const low = grant > 0 ? balance.monthly_balance / grant <= 0.15 : total <= 0;
	const barColor = low ? 'var(--neg)' : 'var(--accent)';

	const bar = grant > 0 ? (
		<div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
			<div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width .3s ease' }} />
		</div>
	) : null;

	if (variant === 'rail') {
		return (
			<Link
				href="/subscriptions"
				className="rail-item"
				title={`${total.toLocaleString()} AI credits left`}
				style={{ textDecoration: 'none' }}
			>
				<Coins size={18} />
				<span className="rail-label" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
					<span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-2)' }}>
						<span>Credits</span>
						<span style={{ fontFamily: 'var(--font-mono)', color: low ? 'var(--neg)' : 'var(--fg)' }}>{total.toLocaleString()}</span>
					</span>
					{bar}
				</span>
				<span className="rail-tip">{total.toLocaleString()} credits left</span>
			</Link>
		);
	}

	if (variant === 'menu') {
		return (
			<Link href="/subscriptions" className="user-menu-row" role="menuitem" style={{ textDecoration: 'none' }}>
				<span className="user-menu-icon"><Coins size={15} /></span>
				<span style={{ flex: 1, minWidth: 0 }}>
					<span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
						<span className="user-menu-label">AI credits</span>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: low ? 'var(--neg)' : 'var(--fg)' }}>
							{total.toLocaleString()}
						</span>
					</span>
					{grant > 0 && <span style={{ display: 'block', marginTop: 6 }}>{bar}</span>}
				</span>
			</Link>
		);
	}

	// card
	return (
		<div className="card" style={{ padding: 'var(--space-4)', background: 'var(--bg-2)' }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<Coins size={18} style={{ color: 'var(--accent)' }} />
					<span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: low ? 'var(--neg)' : 'var(--fg)' }}>
						{total.toLocaleString()}
					</span>
					<span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>AI credits left</span>
				</div>
				<Link href="/subscriptions" className="btn ghost">Get more credits</Link>
			</div>
			{grant > 0 && (
				<>
					{bar}
					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
						<span>{balance.monthly_balance.toLocaleString()} / {grant.toLocaleString()} monthly</span>
						{balance.topup_balance > 0 && <span>+{balance.topup_balance.toLocaleString()} top-up (never expires)</span>}
					</div>
				</>
			)}
			{grant === 0 && balance.topup_balance > 0 && (
				<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{balance.topup_balance.toLocaleString()} top-up credits (never expire)</div>
			)}
		</div>
	);
}
