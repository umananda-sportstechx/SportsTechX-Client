'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Page, Tag } from '@/components/ui/atoms';

type Tab = 'profile' | 'appearance' | 'notifications' | 'workspace' | 'api' | 'billing';

const TABS: Array<{ id: Tab; label: string }> = [
	{ id: 'profile', label: 'Profile' },
	{ id: 'appearance', label: 'Appearance' },
	{ id: 'notifications', label: 'Notifications' },
	{ id: 'workspace', label: 'Workspace' },
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
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						marginBottom: 6,
					}}
				>
					Account
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: 0,
					}}
				>
					Settings
				</h1>
			</div>

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
					{tab === 'workspace' && <WorkspaceTab />}
					{tab === 'api' && <ApiTab />}
					{tab === 'billing' && <BillingTab />}
				</div>
			</div>
		</Page>
	);
}

function ProfileTab() {
	const { data: profile } = useUserProfile();
	const queryClient = useQueryClient();
	const [form, setForm] = useState({
		display_name: '',
		job_title: '',
		company_name: '',
	});

	useEffect(() => {
		if (profile) {
			setForm({
				display_name: profile.display_name ?? '',
				job_title: profile.job_title ?? '',
				company_name: profile.company_name ?? '',
			});
		}
	}, [profile]);

	const save = useMutation({
		mutationFn: (body: typeof form) => apiRequest('PATCH', '/api/profiles/me', body),
		onSuccess: () => {
			toast.success('Profile updated');
			queryClient.invalidateQueries({ queryKey: qk.profile() });
		},
		onError: (e: Error) => toast.error(e.message ?? 'Could not save'),
	});

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
					alignItems: 'center',
					gap: 16,
					marginBottom: 24,
					paddingBottom: 24,
					borderBottom: '1px solid var(--border)',
				}}
			>
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
				<div>
					<button className="btn ghost" disabled>Change avatar</button>
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
				disabled={save.isPending}
				onClick={() => save.mutate(form)}
			>
				{save.isPending ? 'Saving…' : 'Save changes'}
			</button>
		</div>
	);
}

function AppearanceTab() {
	const { theme, setTheme } = useTheme();
	const [accentHue, setAccentHue] = useState<number>(350);

	useEffect(() => {
		const initial = getComputedStyle(document.documentElement).getPropertyValue('--accent-hue').trim();
		const parsed = Number(initial);
		if (Number.isFinite(parsed) && parsed > 0) setAccentHue(parsed);
	}, []);

	const setAccent = (h: number) => {
		document.documentElement.style.setProperty('--accent-hue', String(h));
		setAccentHue(h);
		try {
			localStorage.setItem('stx:accent-hue', String(h));
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
		</div>
	);
}

function NotificationsTab() {
	const items = [
		{ key: 'newsletter', l: 'Weekly newsletter', desc: 'Every Friday — top deals, M&A, market signals.', on: true },
		{ key: 'funding_alerts', l: 'Funding alerts', desc: 'When a tracked company raises capital.', on: true },
		{ key: 'ma_alerts', l: 'M&A alerts', desc: 'Major acquisitions across sports tech.', on: false },
		{ key: 'report_releases', l: 'Report releases', desc: 'When new research drops.', on: true },
		{ key: 'program_deadlines', l: 'Programs deadline', desc: 'Accelerator deadlines approaching.', on: false },
	];
	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
				Notifications
			</h3>
			{items.map((n) => <Toggle key={n.key} l={n.l} desc={n.desc} on={n.on} />)}
		</div>
	);
}

// PLACEHOLDER — team avatar stack (mirrors ui_design prototype).
const MOCK_TEAM = ['UA', 'LA', 'MK', 'TR', 'OS', 'PE', '+2'];

// PLACEHOLDER — integrations list (mirrors ui_design prototype). Wire to a real
// integrations API later — for now status is hardcoded.
const MOCK_INTEGRATIONS: Array<{ name: string; connected: boolean }> = [
	{ name: 'Slack', connected: true },
	{ name: 'Google Sheets', connected: true },
	{ name: 'Salesforce', connected: false },
	{ name: 'Notion', connected: false },
];

// PLACEHOLDER — recent invoices (mirrors ui_design prototype).
const MOCK_INVOICES = [
	{ id: 'mi-1', date: 'May 14, 2026', amount: '$49.00' },
	{ id: 'mi-2', date: 'Apr 14, 2026', amount: '$49.00' },
	{ id: 'mi-3', date: 'Mar 14, 2026', amount: '$49.00' },
];

function WorkspaceTab() {
	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
				Workspace
			</h3>
			<Field label="Workspace name" value="SportsTechX Internal" readOnly />
			<Field label="Default region" value="Global" readOnly />
			<Field label="Default currency" value="USD" readOnly />
			<div style={{ marginTop: 16 }}>
				<div className="co-stat-label" style={{ marginBottom: 8 }}>Members · 7</div>
				<div style={{ display: 'flex' }}>
					{MOCK_TEAM.map((m, i) => (
						<div
							key={m + i}
							style={{
								width: 32,
								height: 32,
								background: i === MOCK_TEAM.length - 1 ? 'var(--bg-3)' : 'var(--accent)',
								color: i === MOCK_TEAM.length - 1 ? 'var(--fg)' : 'var(--accent-fg)',
								display: 'grid',
								placeItems: 'center',
								fontWeight: 700,
								fontSize: 11,
								fontFamily: 'var(--font-display)',
								marginRight: -4,
								border: '2px solid var(--bg-1)',
							}}
						>
							{m}
						</div>
					))}
				</div>
			</div>
		</div>
	);
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
			{MOCK_INTEGRATIONS.map((n) => (
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
						{capitalize(tier)}{isFree ? '' : ' · $49/mo'}
					</div>
					<Link href="/subscriptions">
						<button className="btn ghost">{isFree ? 'Upgrade' : 'Manage'}</button>
					</Link>
				</div>
				<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6 }}>
					{profile?.trial_ends_at ? (
						<>
							<Tag variant="warn">Trial</Tag> ends {new Date(profile.trial_ends_at).toLocaleDateString()}
						</>
					) : (
						<>Renews on Jun 14, 2026</>
					)}
				</div>
			</div>
			<div className="co-stat-label" style={{ marginBottom: 8 }}>Recent invoices</div>
			{MOCK_INVOICES.map((inv) => (
				<div
					key={inv.id}
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 80px 80px 32px',
						alignItems: 'center',
						padding: '12px 0',
						borderBottom: '1px solid var(--border)',
						fontSize: 13,
						gap: 12,
					}}
				>
					<span>{inv.date}</span>
					<span style={{ fontFamily: 'var(--font-mono)' }}>{inv.amount}</span>
					<Tag variant="pos">Paid</Tag>
					<button className="btn ghost" aria-label="Download invoice">↓</button>
				</div>
			))}
		</div>
	);
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

function Toggle({ l, desc, on }: { l: string; desc: string; on: boolean }) {
	const [v, setV] = useState(on);
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
			<button onClick={() => setV(!v)} className={`tg ${v ? 'on' : ''}`}>
				<span className="tg-knob" />
			</button>
		</div>
	);
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
