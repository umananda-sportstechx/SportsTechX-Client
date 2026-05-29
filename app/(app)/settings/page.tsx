'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Page, Tag, Empty, PageTitle } from '@/components/ui/atoms';
import { ImageInput } from '@/components/ui/image-input';

// Workspace tab is intentionally omitted — multi-user / team model is out of
// scope. Re-add when the team module ships.
type Tab = 'profile' | 'appearance' | 'notifications' | 'api' | 'billing';

const TABS: Array<{ id: Tab; label: string }> = [
	{ id: 'profile', label: 'Profile' },
	{ id: 'appearance', label: 'Appearance' },
	{ id: 'notifications', label: 'Notifications' },
	{ id: 'api', label: 'API & integrations' },
	{ id: 'billing', label: 'Billing' },
];

const ACCENTS = [
	{ h: 350, name: 'Crimson' },
	{ h: 14, name: 'Ember' },
	{ h: 40, name: 'Solar' },
	{ h: 140, name: 'Turf' },
	{ h: 220, name: 'Court' },
	{ h: 280, name: 'Violet' },
];

const THEMES = [
	{ id: 'dark', name: 'Dark', desc: 'Stadium night', bg: '#0a0a0c', fg: '#fff' },
	{ id: 'light', name: 'Light', desc: 'Daylight terminal', bg: '#f8f7f4', fg: '#0a0a0c' },
];

/**
 * Settings — pixel-perfect port of ui_design/screens-3.jsx SettingsScreen.
 *
 * Six tabs: Profile / Appearance / Notifications / Workspace / API / Billing.
 * Profile is wired to PATCH /api/profiles/me; Appearance manipulates the
 * `--accent-hue` CSS variable and toggles next-themes; Billing pulls from the
 * existing /api/billing/subscription endpoint.
 */
export default function SettingsPage() {
	const [tab, setTab] = useState<Tab>('profile');
	return (
		<Page>
			<PageTitle kicker="Account" title="Settings" />

			<div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }}>
				<nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
					{TABS.map((t) => (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							className={`set-tab ${tab === t.id ? 'on' : ''}`}
						>
							{t.label}
						</button>
					))}
				</nav>

				<div className="card" style={{ padding: 'var(--space-5)' }}>
					{tab === 'profile' && <ProfileTab />}
					{tab === 'appearance' && <AppearanceTab />}
					{tab === 'notifications' && <NotificationsTab />}
					{tab === 'api' && <ApiTab />}
					{tab === 'billing' && <BillingTab />}
				</div>
			</div>
		</Page>
	);
}

function ProfileTab() {
	const { data: profile } = useUserProfile();
	const { mutate } = useSWRConfig();
	const [form, setForm] = useState({
		display_name: '',
		job_title: '',
		company_name: '',
		avatar_url: '',
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (profile) {
			setForm({
				display_name: profile.display_name ?? '',
				job_title: profile.job_title ?? '',
				company_name: profile.company_name ?? '',
				avatar_url: profile.avatar_url ?? '',
			});
		}
	}, [profile]);

	// Avatar URL persists on `onChange` rather than waiting for "Save" — uploads
	// already round-tripped through Storage at that point, so dropping them on
	// the floor if the user navigates away would just leak orphaned files.
	const persistAvatar = async (url: string) => {
		setForm((s) => ({ ...s, avatar_url: url }));
		try {
			await apiRequest('PATCH', '/api/profiles/me', { avatar_url: url || null });
			void mutate(qk.profile());
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not save avatar');
		}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const { avatar_url: _avatarHandledSeparately, ...rest } = form;
			void _avatarHandledSeparately;
			await apiRequest('PATCH', '/api/profiles/me', rest);
			toast.success('Profile updated');
			void mutate(qk.profile());
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not save');
		} finally {
			setSaving(false);
		}
	};

	const initials = (form.display_name || profile?.email || 'U')
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
				Profile
			</h3>
			<p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 24 }}>
				How you appear in shared workspaces and report comments.
			</p>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: 16,
					marginBottom: 24,
					paddingBottom: 24,
					borderBottom: '1px solid var(--border)',
				}}
			>
				{form.avatar_url ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						src={form.avatar_url}
						alt=""
						style={{
							width: 64, height: 64, objectFit: 'cover',
							background: 'var(--bg-2)',
						}}
					/>
				) : (
					<div
						style={{
							width: 64,
							height: 64,
							background: 'var(--accent)',
							color: 'var(--accent-fg)',
							display: 'grid',
							placeItems: 'center',
							fontFamily: 'var(--font-display)',
							fontWeight: 700,
							fontSize: 22,
						}}
					>
						{initials}
					</div>
				)}
				<div style={{ flex: 1, minWidth: 0, maxWidth: 460 }}>
					<ImageInput
						value={form.avatar_url}
						onChange={(url) => void persistAvatar(url)}
						pathPrefix={`avatars/${profile?.id ?? ''}`}
						placeholder="https://… or upload an image"
						disabled={!profile?.id}
					/>
				</div>
			</div>

			<Field
				label="Full name"
				value={form.display_name}
				onChange={(v) => setForm((s) => ({ ...s, display_name: v }))}
			/>
			<Field label="Email" value={profile?.email ?? ''} readOnly />
			<Field
				label="Title"
				value={form.job_title}
				onChange={(v) => setForm((s) => ({ ...s, job_title: v }))}
			/>
			<Field
				label="Company"
				value={form.company_name}
				onChange={(v) => setForm((s) => ({ ...s, company_name: v }))}
			/>
			<button
				className="btn"
				style={{ marginTop: 16 }}
				disabled={saving}
				onClick={() => void handleSave()}
			>
				{saving ? 'Saving…' : 'Save changes'}
			</button>
		</div>
	);
}

function AppearanceTab() {
	const { theme, setTheme } = useTheme();
	const [accentHue, setAccentHue] = useState<number>(14);
	const [density, setDensityState] = useState<'comfortable' | 'compact'>('compact');

	useEffect(() => {
		const initial = getComputedStyle(document.documentElement).getPropertyValue('--accent-hue').trim();
		const parsed = Number(initial);
		if (Number.isFinite(parsed) && parsed > 0) setAccentHue(parsed);
		const d = document.documentElement.getAttribute('data-density');
		if (d === 'comfortable' || d === 'compact') setDensityState(d);
	}, []);

	const setAccent = (h: number) => {
		document.documentElement.style.setProperty('--accent-hue', String(h));
		setAccentHue(h);
		try {
			localStorage.setItem('stx:accent-hue', String(h));
		} catch { /* ignore */ }
	};

	const setDensity = (d: 'comfortable' | 'compact') => {
		document.documentElement.setAttribute('data-density', d);
		setDensityState(d);
		try {
			localStorage.setItem('stx:density', d);
		} catch { /* ignore */ }
	};

	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
				Appearance
			</h3>
			<p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 24 }}>
				Customise the look of your terminal — accent, theme, density.
			</p>

			<div className="co-stat-label" style={{ marginBottom: 10 }}>Accent color</div>
			<div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
				{ACCENTS.map((c) => (
					<button
						key={c.h}
						onClick={() => setAccent(c.h)}
						className={`acc-swatch ${accentHue === c.h ? 'on' : ''}`}
						title={c.name}
					>
						<span style={{ background: `oklch(60% 0.22 ${c.h})` }} />
						<span className="acc-label">{c.name}</span>
					</button>
				))}
			</div>

			<div className="co-stat-label" style={{ marginBottom: 10 }}>Theme</div>
			<div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
				{THEMES.map((t) => (
					<button
						key={t.id}
						onClick={() => setTheme(t.id)}
						className={`theme-card ${theme === t.id ? 'on' : ''}`}
					>
						<div className="theme-prev" style={{ background: t.bg, color: t.fg }}>
							<div style={{ height: 6, background: 'currentColor', opacity: 0.15, width: '40%' }} />
							<div style={{ height: 4, background: 'currentColor', opacity: 0.1, width: '70%', marginTop: 4 }} />
							<div style={{ height: 4, background: 'currentColor', opacity: 0.1, width: '60%', marginTop: 3 }} />
							<div
								style={{
									position: 'absolute',
									right: 8,
									bottom: 8,
									width: 14,
									height: 14,
									background: `oklch(60% 0.22 ${accentHue})`,
								}}
							/>
						</div>
						<div style={{ padding: '10px 12px' }}>
							<div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
							<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.desc}</div>
						</div>
					</button>
				))}
			</div>

			<div className="co-stat-label" style={{ marginBottom: 10 }}>Density</div>
			<div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
				{([
					{ id: 'comfortable', name: 'Comfortable', desc: 'Roomier spacing' },
					{ id: 'compact', name: 'Compact', desc: 'Denser, more on screen' },
				] as const).map((d) => (
					<button
						key={d.id}
						onClick={() => setDensity(d.id)}
						className={`btn ${density === d.id ? '' : 'ghost'}`}
						style={{ height: 'auto', padding: '10px 16px', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
					>
						<span style={{ fontWeight: 700, fontSize: 13 }}>{d.name}</span>
						<span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>{d.desc}</span>
					</button>
				))}
			</div>
		</div>
	);
}

function NotificationsTab() {
	const { data: profile } = useUserProfile();
	const { mutate } = useSWRConfig();
	const [pending, setPending] = useState<string | null>(null);

	const items: Array<{ key: 'notification_newsletter' | 'notification_email' | 'notification_marketing' | 'notification_updates'; l: string; desc: string }> = [
		{ key: 'notification_newsletter', l: 'Weekly newsletter', desc: 'Every Friday — top deals, M&A, market signals.' },
		{ key: 'notification_email',      l: 'Email alerts',      desc: 'Funding, M&A, and report-release alerts as they happen.' },
		{ key: 'notification_updates',    l: 'Product updates',   desc: 'New features, scheduled events, and changes that affect you.' },
		{ key: 'notification_marketing',  l: 'Marketing emails',  desc: 'Occasional product news + cross-promotional partnerships.' },
	];

	const toggle = async (key: typeof items[number]['key'], next: boolean) => {
		setPending(key);
		// Optimistic — flip the cached profile so the toggle moves instantly.
		void mutate(qk.profile(), (prev: Record<string, unknown> | undefined) =>
			prev ? { ...prev, [key]: next } : prev, { revalidate: false });
		try {
			const res = await apiRequest('PATCH', '/api/profiles/me', { [key]: next });
			if (!res.ok) throw new Error(`${res.status}`);
		} catch (e) {
			toast.error(`Couldn't save: ${(e as Error).message}`);
			void mutate(qk.profile()); // rollback to server truth
		} finally {
			setPending(null);
			void mutate(qk.profile()); // reconcile
		}
	};

	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
				Notifications
			</h3>
			{items.map((n) => (
				<Toggle
					key={n.key}
					l={n.l}
					desc={n.desc}
					on={profile?.[n.key] ?? false}
					disabled={pending === n.key}
					onToggle={(next) => void toggle(n.key, next)}
				/>
			))}
		</div>
	);
}

// Integrations list — hardcoded for now (no integrations registry endpoint yet).
// Replace with `/api/integrations/me` if/when that ships.
const INTEGRATIONS: Array<{ name: string; connected: boolean }> = [
	{ name: 'Intercom', connected: true },
	{ name: 'Slack', connected: false },
	{ name: 'Google Sheets', connected: false },
	{ name: 'Salesforce', connected: false },
];

interface StripeInvoice {
	id: string;
	number: string | null;
	status: string | null;
	amount_paid: number;        // cents
	currency: string;
	created: number;            // unix seconds
	hosted_invoice_url: string | null;
	invoice_pdf: string | null;
}

function ApiTab() {
	const [revealed, setRevealed] = useState(false);
	const keyDisplay = revealed
		? 'stx_live_3f9c8b2d4e7a1f6h9k3m5n8p2q4r6s8t'
		: 'stx_live_••••••••••••••••••••••••';
	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
				API & integrations
			</h3>
			<div className="co-stat-label" style={{ marginBottom: 8 }}>Personal API key</div>
			<div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
				<input
					className="search-input"
					style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
					value={keyDisplay}
					readOnly
				/>
				<button className="btn ghost" onClick={() => setRevealed((v) => !v)}>
					{revealed ? 'Hide' : 'Reveal'}
				</button>
				<Link href="/api-keys"><button className="btn ghost">Rotate</button></Link>
			</div>
			<div className="co-stat-label" style={{ marginBottom: 8 }}>Connected integrations</div>
			{INTEGRATIONS.map((n) => (
				<div
					key={n.name}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						padding: '12px 0',
						borderBottom: '1px solid var(--border)',
					}}
				>
					<div
						style={{
							width: 32,
							height: 32,
							background: 'var(--bg-3)',
							display: 'grid',
							placeItems: 'center',
							fontWeight: 700,
							fontSize: 12,
							fontFamily: 'var(--font-display)',
						}}
					>
						{n.name[0]}
					</div>
					<div style={{ flex: 1 }}>
						<div style={{ fontWeight: 600, fontSize: 14 }}>{n.name}</div>
						<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
							{n.connected ? 'Connected' : 'Not connected'}
						</div>
					</div>
					<Link href="/integrations">
						<button className="btn ghost">{n.connected ? 'Disconnect' : 'Connect'}</button>
					</Link>
				</div>
			))}
		</div>
	);
}

function BillingTab() {
	const { data: profile } = useUserProfile();
	const tier = (profile?.user_type ?? 'free').toLowerCase();
	const isFree = tier === 'free';

	// Free-tier users have no Stripe customer → /invoices returns []. Suppress
	// the fetch entirely to avoid the network round-trip + flicker.
	const { data: invoices, isLoading: invoicesLoading } = useSWR<StripeInvoice[]>(
		isFree ? null : qk.billing.invoices(),
		{ dedupingInterval: 5 * 60_000 },
	);
	const list = invoices ?? [];

	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
				Billing
			</h3>
			<div
				className="card"
				style={{ padding: 'var(--space-4)', background: 'var(--bg-2)', marginBottom: 16 }}
			>
				<div className="co-stat-label">Current plan</div>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
					<div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
						{capitalize(tier)}
					</div>
					<Link href="/subscriptions">
						<button className="btn ghost">{isFree ? 'Upgrade' : 'Manage'}</button>
					</Link>
				</div>
				{profile?.trial_ends_at && (
					<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6 }}>
						<Tag variant="warn">Trial</Tag> ends {new Date(profile.trial_ends_at).toLocaleDateString()}
					</div>
				)}
			</div>
			<div className="co-stat-label" style={{ marginBottom: 8 }}>Recent invoices</div>
			{isFree ? (
				<Empty msg="No invoices — you're on the free plan." />
			) : invoicesLoading && list.length === 0 ? (
				<Empty msg="Loading invoices…" />
			) : list.length === 0 ? (
				<Empty msg="No invoices yet." />
			) : (
				list.map((inv) => (
					<div
						key={inv.id}
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 100px 80px 32px',
							alignItems: 'center',
							padding: '12px 0',
							borderBottom: '1px solid var(--border)',
							fontSize: 13,
							gap: 12,
						}}
					>
						<span>{formatInvoiceDate(inv.created)}</span>
						<span style={{ fontFamily: 'var(--font-mono)' }}>
							{formatMoney(inv.amount_paid, inv.currency)}
						</span>
						<Tag variant={inv.status === 'paid' ? 'pos' : 'warn'}>
							{inv.status ? capitalize(inv.status) : 'Open'}
						</Tag>
						{inv.invoice_pdf ? (
							<a
								href={inv.invoice_pdf}
								target="_blank"
								rel="noopener noreferrer"
								className="btn ghost"
								aria-label="Download invoice"
								style={{ textDecoration: 'none' }}
							>
								↓
							</a>
						) : <span />}
					</div>
				))
			)}
		</div>
	);
}

function formatInvoiceDate(unixSeconds: number): string {
	if (!unixSeconds) return '—';
	return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
		month: 'short', day: 'numeric', year: 'numeric',
	});
}

function formatMoney(cents: number, currency: string): string {
	const value = (cents / 100).toFixed(2);
	const cur = (currency ?? 'USD').toUpperCase();
	if (cur === 'USD') return `$${value}`;
	if (cur === 'EUR') return `€${value}`;
	if (cur === 'GBP') return `£${value}`;
	return `${cur} ${value}`;
}

function Field({
	label,
	value,
	onChange,
	readOnly,
}: {
	label: string;
	value: string;
	onChange?: (v: string) => void;
	readOnly?: boolean;
}) {
	return (
		<div style={{ marginBottom: 14 }}>
			<div className="co-stat-label" style={{ marginBottom: 6 }}>{label}</div>
			<input
				className="search-input"
				style={{ width: '100%' }}
				value={value}
				onChange={onChange ? (e) => onChange(e.target.value) : undefined}
				readOnly={readOnly}
			/>
		</div>
	);
}

function Toggle({
	l, desc, on, disabled, onToggle,
}: {
	l: string;
	desc: string;
	on: boolean;
	disabled?: boolean;
	onToggle?: (next: boolean) => void;
}) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				padding: '14px 0',
				borderBottom: '1px solid var(--border)',
			}}
		>
			<div style={{ flex: 1 }}>
				<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{l}</div>
				<div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{desc}</div>
			</div>
			<button
				onClick={() => !disabled && onToggle?.(!on)}
				disabled={disabled}
				className={`tg ${on ? 'on' : ''}`}
				style={{ opacity: disabled ? 0.6 : 1 }}
			>
				<span className="tg-knob" />
			</button>
		</div>
	);
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
