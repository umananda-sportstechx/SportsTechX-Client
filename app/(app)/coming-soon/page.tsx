'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { Brand } from '@/components/ui/brand';
import { Button, Card } from '@/components/atlas';

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
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)', color: 'var(--a-ink)' }}>
			<Card glow="blue" style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '40px 28px 34px' }}>
				<Brand variant="horizontal" height={34} />
				<div className="atlas-eyebrow" style={{ marginTop: 14 }}>{label} plan</div>
				<h1 style={{ fontFamily: 'var(--a-font)', fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: 'var(--a-ink)', margin: 0 }}>Coming soon</h1>
				<p style={{ fontSize: 13, color: 'var(--a-muted)', maxWidth: 420, lineHeight: 1.55, margin: 0 }}>
					Your workspace is being built — we&apos;ll let you know the moment it&apos;s ready. In the meantime you can review your plan and subscription anytime.
				</p>
				<div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
					<Button href="/billing" variant="outline">Plan &amp; billing</Button>
					<Button variant="danger" onClick={() => void logout()} disabled={out}>
						{out ? 'Signing out…' : 'Sign out'}
					</Button>
				</div>
			</Card>
		</div>
	);
}
