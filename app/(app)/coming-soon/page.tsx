'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/atlas/kit';

/**
 * Shared landing for the free / general / scout plans — their workspaces aren't
 * built yet, so they get a clean "coming soon" placeholder. Only the `raise`
 * plan has a live workspace today (gated in AppShell + the server @RequireTier).
 */
const PLAN_LABEL: Record<string, string> = { free: 'Free', general: 'General', scout: 'Scout', raise: 'Raise', growth: 'General', pro: 'Raise' };

export default function ComingSoonPage() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const [out, setOut] = useState(false);
	const plan = getUserType(profile);
	const label = PLAN_LABEL[plan] ?? 'Your';

	const logout = async () => {
		setOut(true);
		try { await getSupabaseBrowser().auth.signOut(); router.push('/login'); }
		catch { setOut(false); }
	};

	return (
		<div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 14 }}>
			<Brand variant="horizontal" height={34} />
			<div style={{ marginTop: 18, fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-navy)' }}>{label} plan</div>
			<h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--a-ink)', margin: 0, letterSpacing: '-0.02em' }}>Coming soon</h1>
			<p style={{ fontSize: 14, color: 'var(--a-muted)', maxWidth: 460, lineHeight: 1.55, margin: 0 }}>
				Your workspace is being built — we&apos;ll let you know the moment it&apos;s ready. In the meantime you can review your plan and subscription anytime.
			</p>
			<div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
				<Button href="/billing" variant="outline" size="sm">Plan &amp; billing</Button>
				<button onClick={() => void logout()} disabled={out} style={{ background: 'none', border: 'none', color: 'var(--a-danger)', fontSize: 13, cursor: 'pointer' }}>
					{out ? 'Signing out…' : 'Sign out'}
				</button>
			</div>
		</div>
	);
}
