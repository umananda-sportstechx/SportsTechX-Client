'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getSupabaseBrowser } from '@/lib/supabase/client';

/**
 * Atlas Raise — Account (mock-up 17): profile, security and notification
 * preferences for the founder. Profile name/email come from the user profile;
 * password reset routes through Supabase. Notification toggles are display-only
 * in v1 (no preference store wired yet).
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
			const { error } = await getSupabaseBrowser().auth.resetPasswordForEmail(profile.email, {
				redirectTo: `${window.location.origin}/reset-password`,
			});
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
		<Page>
			<div style={{ maxWidth: 1120 }}>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 24px' }}>Account</h1>

				<Card title="Profile">
					<div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
						<div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600, color: 'var(--fg-2)' }}>{initial}</div>
						<div>
							<div style={{ fontSize: 14, fontWeight: 500 }}>{name || '—'}</div>
							<div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{profile?.account_type === 'founder' ? 'Founder' : profile?.account_type ?? ''}{profile?.company_name ? `, ${profile.company_name}` : ''}</div>
						</div>
					</div>
					<Row>
						<ReadOnly label="Full name" value={name || '—'} />
						<ReadOnly label="Email" value={profile?.email ?? '—'} />
					</Row>
				</Card>

				<Card title="Security">
					<SplitRow label="Password" sub="Managed through email reset">
						<button className="btn ghost" disabled={busy} onClick={() => void changePassword()}>{busy ? <Loader2 className="spin" size={13} /> : 'Change password'}</button>
					</SplitRow>
					<Divider />
					<SplitRow label="Two-factor authentication" sub="Not enabled">
						<button className="btn ghost" disabled title="Coming soon">Enable</button>
					</SplitRow>
				</Card>

				<Card title="Notifications">
					<Toggle label="Weekly raise recap" on={prefs.weekly} set={(v) => setPrefs((p) => ({ ...p, weekly: v }))} />
					<Toggle label="Overdue follow-up reminders" on={prefs.overdue} set={(v) => setPrefs((p) => ({ ...p, overdue: v }))} />
					<Toggle label="Product updates" on={prefs.product} set={(v) => setPrefs((p) => ({ ...p, product: v }))} />
					<div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 10 }}>Notification preferences are saved locally for now.</div>
				</Card>

				<button onClick={() => void logout()} disabled={signingOut} style={{ background: 'none', border: 'none', color: '#A32D2D', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}>
					{signingOut ? 'Logging out…' : 'Log out'}
				</button>
			</div>
		</Page>
	);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
	return <div className="card" style={{ padding: 22, marginBottom: 18 }}>
		<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{title}</div>{children}
	</div>;
}
function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>; }
function Divider() { return <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />; }
function ReadOnly({ label, value }: { label: string; value: string }) {
	return <div>
		<div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 6 }}>{label}</div>
		<div style={{ height: 38, padding: '0 12px', display: 'flex', alignItems: 'center', background: 'var(--bg-1)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 13 }}>{value}</div>
	</div>;
}
function SplitRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
	return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
		<div><div style={{ fontSize: 13 }}>{label}</div>{sub && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{sub}</div>}</div>
		{children}
	</div>;
}
function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
	return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
		<span style={{ fontSize: 13 }}>{label}</span>
		<button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)}
			style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: on ? 'var(--raise-btn, #1F1E1C)' : 'var(--border-strong)', position: 'relative', transition: 'background 0.15s' }}>
			<span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
		</button>
	</div>;
}
