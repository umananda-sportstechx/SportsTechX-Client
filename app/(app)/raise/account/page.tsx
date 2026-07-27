'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Screen, H1, Card, Field, ReadOnly, Button } from '@/components/atlas/kit';

/**
 * Atlas Raise — Account (mock-up 17): profile, security and notification
 * preferences. Profile name/email come from the user profile; password reset
 * routes through Supabase. Notification toggles are local-only in v1.
 */
export default function RaiseAccountPage() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const [busy, setBusy] = useState(false);
	const [signingOut, setSigningOut] = useState(false);
	const [prefs, setPrefs] = useState({ weekly: true, overdue: true, product: false });

	const name = profile?.display_name ?? profile?.full_name ?? '';
	const initial = (name || profile?.email || '?').charAt(0).toUpperCase();

	const changePassword = async () => {
		if (!profile?.email) { toast.error('No email on file'); return; }
		setBusy(true);
		try {
			const { error } = await getSupabaseBrowser().auth.resetPasswordForEmail(profile.email, { redirectTo: `${window.location.origin}/reset-password` });
			if (error) throw error;
			toast.success('Password reset email sent');
		} catch (e) { toast.error((e as Error).message ?? 'Could not send email'); }
		finally { setBusy(false); }
	};

	const logout = async () => {
		if (signingOut) return;
		setSigningOut(true);
		try { await getSupabaseBrowser().auth.signOut(); router.push('/login'); }
		catch { setSigningOut(false); }
	};

	return (
		<Screen>
			<H1>Account</H1>

			<div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
				<Card style={{ padding: 22 }}>
					<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Profile</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
						<div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--a-inset)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600, color: 'var(--a-muted)' }}>{initial}</div>
						<div>
							<div style={{ fontSize: 14, fontWeight: 500 }}>{name || '—'}</div>
							<div style={{ fontSize: 12, color: 'var(--a-faint)' }}>{profile?.account_type === 'founder' ? 'Founder' : profile?.account_type ?? ''}{profile?.company_name ? `, ${profile.company_name}` : ''}</div>
						</div>
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
						<ReadOnly label="Full name" value={name || '—'} />
						<ReadOnly label="Email" value={profile?.email ?? '—'} />
					</div>
				</Card>

				<Card style={{ padding: 22 }}>
					<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Security</div>
					<SplitRow label="Password" sub="Managed through email reset">
						<Button variant="outline" size="sm" disabled={busy} onClick={() => void changePassword()}>{busy ? <Loader2 className="spin" size={13} /> : 'Change password'}</Button>
					</SplitRow>
					<div style={{ height: 1, background: 'var(--a-border)', margin: '14px 0' }} />
					<SplitRow label="Two-factor authentication" sub="Not enabled">
						<Button variant="outline" size="sm" disabled title="Coming soon">Enable</Button>
					</SplitRow>
				</Card>

				<Card style={{ padding: 22 }}>
					<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Notifications</div>
					<Toggle label="Weekly raise recap" on={prefs.weekly} set={(v) => setPrefs((p) => ({ ...p, weekly: v }))} />
					<Toggle label="Overdue follow-up reminders" on={prefs.overdue} set={(v) => setPrefs((p) => ({ ...p, overdue: v }))} />
					<Toggle label="Product updates" on={prefs.product} set={(v) => setPrefs((p) => ({ ...p, product: v }))} />
					<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 10 }}>Notification preferences are saved locally for now.</div>
				</Card>

				<button onClick={() => void logout()} disabled={signingOut} style={{ background: 'none', border: 'none', color: 'var(--a-danger)', fontSize: 13, cursor: 'pointer', padding: '4px 0', justifySelf: 'start' }}>
					{signingOut ? 'Logging out…' : 'Log out'}
				</button>
			</div>
		</Screen>
	);
}

function SplitRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
	return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
		<div><div style={{ fontSize: 13 }}>{label}</div>{sub && <div style={{ fontSize: 12, color: 'var(--a-faint)' }}>{sub}</div>}</div>
		{children}
	</div>;
}
function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
	return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
		<span style={{ fontSize: 13 }}>{label}</span>
		<button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)}
			style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: on ? 'var(--a-primary)' : 'var(--a-border-strong)', position: 'relative', transition: 'background 0.15s' }}>
			<span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
		</button>
	</div>;
}
