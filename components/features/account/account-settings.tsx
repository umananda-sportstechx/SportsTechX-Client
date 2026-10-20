'use client';

import { AccountTabs } from './account-tabs';
import { useEffect, useRef, useState } from 'react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLogout } from '@/hooks/use-logout';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Screen, PageHead, Card, ReadOnly, Button } from '@/components/atlas';
import { PasswordField } from '@/components/auth/auth-shell';
import { VerifyButton } from '@/components/features/verify/verify-cta';

/**
 * Account (Raise mock-up 17, Scout "Account"): profile, security and
 * notification preferences. Profile name/email come from the user profile;
 * password reset routes through Supabase. Notification toggles are local-only
 * in v1 — each product passes its own list.
 */
/**
 * The notification preferences that actually exist.
 *
 * These are the eight `profiles.notification_*` columns — already in
 * `updateProfileSchema`, already written by `PATCH /api/me`, already returned
 * by `GET /api/me`, and genuinely read by `digest-email.processor.ts`.
 *
 * What was here before was three per-tier lists of invented keys ("Weekly
 * raise recap", "Watchlist signals", "Overdue follow-up reminders") held in a
 * `useState` initialiser. They were fake twice over: nothing persisted them,
 * and no column or sender existed behind them either. Until now the only way
 * to change a real preference was to ask the chat agent, which has had a
 * `update_my_notification_settings` tool all along.
 */
type NotificationKey =
	| 'notification_email' | 'notification_newsletter' | 'notification_updates'
	| 'notification_marketing' | 'notification_report_releases'
	| 'notification_funding_alerts' | 'notification_ma_alerts'
	| 'notification_programs_deadline';

/** Friendly labels for the Supabase identity providers an account can carry. */
const PROVIDER_LABEL: Record<string, string> = {
	email: 'Email & password',
	google: 'Google',
	linkedin_oidc: 'LinkedIn',
};

const NOTIFICATIONS: { key: NotificationKey; label: string; sub: string }[] = [
	{ key: 'notification_email', label: 'Email notifications', sub: 'The master switch — turn this off and we send you nothing.' },
	{ key: 'notification_newsletter', label: 'Newsletter and digests', sub: 'Saved-search digests and the SportsTechX newsletter.' },
	{ key: 'notification_report_releases', label: 'New reports', sub: 'When a report or monthly roundup is published.' },
	{ key: 'notification_funding_alerts', label: 'Funding alerts', sub: 'New rounds involving companies you follow.' },
	{ key: 'notification_ma_alerts', label: 'M&A alerts', sub: 'Acquisitions and exits across the market.' },
	{ key: 'notification_programs_deadline', label: 'Programme deadlines', sub: 'Application windows closing for accelerators and programmes.' },
	{ key: 'notification_updates', label: 'Product updates', sub: 'Changes and new features in Atlas.' },
	{ key: 'notification_marketing', label: 'Offers', sub: 'Occasional news about plans and pricing.' },
];

export function AccountSettings({ sub, extra }: { sub?: string; /** Product-specific cards before Log out (e.g. Explore's product access). */ extra?: React.ReactNode }) {
	const { data: profile } = useUserProfile();
	const [busy, setBusy] = useState(false);
	const { logout, signingOut } = useLogout();
	// Avatar upload: mint a signed URL, push the file straight to the public
	// bucket, then persist the public URL on the profile. See uploadAvatar below.
	const [avatarBusy, setAvatarBusy] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);
	// In-platform password change: open the form, re-auth with the current
	// password, then update. No email round-trip.
	const [pwOpen, setPwOpen] = useState(false);
	const [curPw, setCurPw] = useState('');
	const [newPw, setNewPw] = useState('');
	const [confirmPw, setConfirmPw] = useState('');
	const closePw = () => { setPwOpen(false); setCurPw(''); setNewPw(''); setConfirmPw(''); };
	// The identity providers on this account (google / linkedin_oidc / email).
	// An account with no `email` identity has no password, so we offer "Set a
	// password" (adds an email+password login) rather than "Change password".
	const [providers, setProviders] = useState<string[]>([]);
	useEffect(() => {
		let alive = true;
		getSupabaseBrowser().auth.getUser().then(({ data }) => {
			if (!alive) return;
			const ids = data.user?.identities?.map((i) => i.provider) ?? data.user?.app_metadata?.providers ?? [];
			setProviders([...new Set(ids)]);
		}).catch(() => { /* leave empty; the password card just won't branch */ });
		return () => { alive = false; };
	}, []);
	const hasPassword = providers.includes('email');
	// Overlay, not a snapshot: the old `useState` initialiser read the props
	// once at mount and then drifted from the server forever.
	const [pending, setPending] = useState<Partial<Record<NotificationKey, boolean>>>({});
	const prefOf = (k: NotificationKey) => pending[k] ?? profile?.[k] ?? true;

	// Optimistic, and reverted on failure — a toggle that silently fails is how
	// this section got its reputation.
	// Drop the overlay entry either way: on success the revalidated profile is
	// the truth, on failure the stale server value is.
	const clearPending = (k: NotificationKey) =>
		setPending((p) => Object.fromEntries(Object.entries(p).filter(([key]) => key !== k)));

	const setPref = async (k: NotificationKey, v: boolean) => {
		setPending((p) => ({ ...p, [k]: v }));
		try {
			const res = await apiRequest('PATCH', '/api/me', { [k]: v });
			if (!res.ok) throw new Error(String(res.status));
			await mutate(qk.profile());
		} catch {
			toast.error('Could not save that preference. Try again.');
		} finally {
			clearPending(k);
		}
	};

	const name = profile?.display_name ?? profile?.full_name ?? '';
	const initial = (name || profile?.email || '?').charAt(0).toUpperCase();

	const savePassword = async () => {
		if (hasPassword && !curPw) { toast.error('Enter your current password.'); return; }
		if (newPw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
		if (newPw !== confirmPw) { toast.error('Passwords do not match.'); return; }
		setBusy(true);
		try {
			const supabase = getSupabaseBrowser();
			if (hasPassword) {
				if (!profile?.email) { toast.error('No email on file'); return; }
				// Re-authenticate first so a hijacked open session can't change the
				// password without knowing the current one — fail closed on a bad match.
				const { error: authErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: curPw });
				if (authErr) { toast.error('Current password is incorrect.'); return; }
				// GoTrue also wants the current password passed to the update when the
				// project's "Require current password when updating" setting is on
				// (ours is). Optional field, harmless when it's off.
				const { error } = await supabase.auth.updateUser({ password: newPw, current_password: curPw });
				if (error) throw error;
				toast.success('Password updated.');
			} else {
				// OAuth-only account (Google / LinkedIn, no password). This SETS the
				// first password — no current one exists, so none is sent. The
				// account's email + this password then become an email login.
				const { error } = await supabase.auth.updateUser({ password: newPw });
				if (error) throw error;
				toast.success('Password set — you can now sign in with your email and password.');
				setProviders((p) => [...new Set([...p, 'email'])]);
			}
			closePw();
		} catch (e) { toast.error((e as Error).message ?? 'Could not save password'); }
		finally { setBusy(false); }
	};

	// Signed-URL upload: POST mints a one-time token for the public bucket, the
	// browser pushes the file to it, then PATCH stores the public URL. Mirrors
	// the report-PDF upload pattern; no image bytes touch our API.
	const uploadAvatar = async (file: File) => {
		if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { toast.error('Use a PNG, JPEG, WebP or GIF image.'); return; }
		if (file.size > 3 * 1024 * 1024) { toast.error('Image must be under 3 MB.'); return; }
		setAvatarBusy(true);
		try {
			const res = await apiRequest('POST', '/api/me/avatar-upload-url', { content_type: file.type });
			if (!res.ok) throw new Error(String(res.status));
			const { bucket, path, token, avatar_url } = await res.json() as { bucket: string; path: string; token: string; avatar_url: string };
			const up = await getSupabaseBrowser().storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type });
			if (up.error) throw up.error;
			const save = await apiRequest('PATCH', '/api/me', { avatar_url });
			if (!save.ok) throw new Error(String(save.status));
			await mutate(qk.profile());
			toast.success('Photo updated.');
		} catch (e) { toast.error((e as Error).message ?? 'Could not upload photo'); }
		finally { setAvatarBusy(false); }
	};
	const removeAvatar = async () => {
		setAvatarBusy(true);
		try {
			const res = await apiRequest('PATCH', '/api/me', { avatar_url: null });
			if (!res.ok) throw new Error(String(res.status));
			await mutate(qk.profile());
			toast.success('Photo removed.');
		} catch (e) { toast.error((e as Error).message ?? 'Could not remove photo'); }
		finally { setAvatarBusy(false); }
	};

	return (
		<Screen>
			<PageHead title="Account" sub={sub} />
			<AccountTabs />

			<div style={{ display: 'grid', gap: 18 }}>
				<Card>
					<div style={{ fontSize: 16, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)', marginBottom: 16 }}>Profile</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
						<div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 'var(--a-radius-sm)', overflow: 'hidden', background: 'var(--a-primary)', display: 'grid', placeItems: 'center', fontSize: 16, fontFamily: 'var(--a-mono)', color: 'var(--a-primary-ink)' }}>
							{profile?.avatar_url
								// eslint-disable-next-line @next/next/no-img-element
								? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
								: initial}
						</div>
						<div style={{ minWidth: 0 }}>
							<div style={{ fontSize: 15, fontFamily: 'var(--a-font)', fontWeight: 700 }}>{name || '—'}</div>
							<div style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)', marginTop: 4 }}>{profile?.account_type === 'founder' ? 'Founder' : profile?.account_type === 'investor' ? 'Investor' : profile?.account_type ?? ''}{profile?.company_name ? `, ${profile.company_name}` : ''}</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
								<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }}
									onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ''; }} />
								<Button variant="outline" size="sm" disabled={avatarBusy} onClick={() => fileRef.current?.click()}>
									{avatarBusy ? <Loader2 size={13} className="animate-spin" /> : null}{profile?.avatar_url ? 'Change photo' : 'Upload photo'}
								</Button>
								{profile?.avatar_url && <Button variant="outline" size="sm" disabled={avatarBusy} onClick={() => void removeAvatar()}>Remove</Button>}
							</div>
						</div>
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
						<ReadOnly label="Full name" value={name || '—'} />
						<ReadOnly label="Email" value={profile?.email ?? '—'} />
					</div>
				</Card>

				<Card>
					<div style={{ fontSize: 16, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)', marginBottom: 16 }}>Security</div>

					<SplitRow label="Sign-in methods" sub="How you sign in to this account">
						<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
							{providers.length === 0
								? <span style={{ fontSize: 12, color: 'var(--a-muted)' }}>—</span>
								: providers.map((p) => (
									<span key={p} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, padding: '4px 10px', borderRadius: 'var(--a-radius-pill)', background: 'var(--a-inset)', border: '1px solid var(--a-border)', color: 'var(--a-ink)' }}>{PROVIDER_LABEL[p] ?? p}</span>
								))}
						</div>
					</SplitRow>

					<div style={{ height: 1, background: 'var(--a-border)', margin: '14px 0' }} />

					{!pwOpen ? (
						<SplitRow
							label={hasPassword ? 'Password' : 'Set a password'}
							sub={hasPassword ? 'Change your password without leaving the app' : 'Add an email + password login so you can also sign in without a provider'}
						>
							<Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>{hasPassword ? 'Change password' : 'Set password'}</Button>
						</SplitRow>
					) : (
						<div style={{ display: 'grid', gap: 14, maxWidth: 380 }}>
							{hasPassword && <PasswordField id="acct-cur-pw" label="Current password" value={curPw} onChange={setCurPw} autoComplete="current-password" minLength={1} placeholder="Your current password" />}
							<PasswordField id="acct-new-pw" label={hasPassword ? 'New password' : 'Password'} value={newPw} onChange={setNewPw} autoComplete="new-password" placeholder="At least 8 characters" />
							<PasswordField id="acct-confirm-pw" label="Confirm password" value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" placeholder="Re-enter password" />
							<div style={{ display: 'flex', gap: 10 }}>
								<Button size="sm" disabled={busy} onClick={() => void savePassword()}>{busy ? <Loader2 className="animate-spin" size={13} /> : hasPassword ? 'Update password' : 'Set password'}</Button>
								<Button size="sm" variant="outline" disabled={busy} onClick={closePw}>Cancel</Button>
							</div>
						</div>
					)}
				</Card>

				<Card>
					<div style={{ fontSize: 16, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)', marginBottom: 6 }}>Notifications</div>
					{NOTIFICATIONS.map((n) => (
						<Toggle key={n.key} label={n.label} sub={n.sub} on={prefOf(n.key)} set={(v) => void setPref(n.key, v)} />
					))}
				</Card>

				{/* Verification lives on every tier's Account page, not just the paid
					    ones — the whole point is that a free user can correct their own
					    company's record. */}
				<Card className="explore-card">
					<div className="atlas-eyebrow">Verification</div>
					<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
						<p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)', margin: 0, maxWidth: 420 }}>
							Claim your company or fund to keep its details accurate on Atlas.
						</p>
						<VerifyButton />
					</div>
				</Card>
				{extra}

				<button onClick={() => void logout()} disabled={signingOut} style={{ background: 'none', border: 'none', color: 'var(--a-danger)', fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '4px 0', justifySelf: 'start' }}>
					{signingOut ? 'Logging out…' : 'Log out'}
				</button>
			</div>
		</Screen>
	);
}

function SplitRow({ label, sub, children }: { label: React.ReactNode; sub?: string; children: React.ReactNode }) {
	return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
		<div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink)' }}>{label}</div>{sub && <div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 2 }}>{sub}</div>}</div>
		{children}
	</div>;
}
function Toggle({ label, sub, on, set }: { label: string; sub?: string; on: boolean; set: (v: boolean) => void }) {
	return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderTop: '1px solid var(--a-border)' }}>
		<span style={{ minWidth: 0 }}>
			<span style={{ display: 'block', fontSize: 13, color: 'var(--a-ink-2)' }}>{label}</span>
			{sub && <span style={{ display: 'block', fontSize: 11, color: 'var(--a-faint)', marginTop: 2, lineHeight: 1.45 }}>{sub}</span>}
		</span>
		<button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)}
			style={{ width: 39, height: 22, flexShrink: 0, borderRadius: 'var(--a-radius-pill)', border: '0.5px solid var(--a-border)', padding: 0, cursor: 'pointer', background: on ? 'var(--a-primary)' : 'var(--a-track)', position: 'relative', transition: 'background 0.15s' }}>
			<span style={{ position: 'absolute', top: 2.5, left: on ? 19.5 : 2.5, width: 16, height: 16, borderRadius: '50%', background: on ? 'var(--a-primary-ink)' : 'var(--a-field)', boxShadow: '0 1px 2px rgba(0,0,0,0.18)', transition: 'left 0.15s, background 0.15s' }} />
		</button>
	</div>;
}
