'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile, type AccountType } from '@/hooks/use-user-profile';
import { usePersona, type Persona } from '@/contexts/persona-context';
import { Page, Tag, Empty, PageTitle } from '@/components/ui/atoms';
import { CreditMeter } from '@/components/shell/credit-meter';
import { ImageInput } from '@/components/ui/image-input';

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
const VALID_TABS = new Set<Tab>(['profile', 'appearance', 'notifications', 'workspace', 'api', 'billing']);

export default function SettingsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	// Persist the active tab in `?tab=…` so the URL is shareable, reloadable,
	// and back/forward-button correct. Default = profile; unknown values fall
	// back to profile rather than rendering an empty pane.
	const urlTab = params.get('tab') as Tab | null;
	const [tab, setTabState] = useState<Tab>(urlTab && VALID_TABS.has(urlTab) ? urlTab : 'profile');

	const setTab = (next: Tab) => {
		setTabState(next);
		const sp = new URLSearchParams(params.toString());
		if (next === 'profile') sp.delete('tab');
		else sp.set('tab', next);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	};

	// Keep state in sync when the user navigates via back/forward — Next's
	// `router.replace` doesn't fire an effect on the same component, but
	// URL changes from anywhere else (back button, manual paste) re-render
	// useSearchParams.
	useEffect(() => {
		if (urlTab && VALID_TABS.has(urlTab) && urlTab !== tab) setTabState(urlTab);
		// `tab` intentionally NOT in deps — only react to URL changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [urlTab]);

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
					{tab === 'workspace' && <WorkspaceTab />}
					{tab === 'api' && <ApiTab />}
					{tab === 'billing' && <BillingTab />}
				</div>
			</div>
		</Page>
	);
}

// Persona ↔ account_type. account_type is the persisted column ('founder' |
// 'investor' | 'user'); persona is the active workspace ('founder' | 'investor'
// | 'general'). 'user' ↔ 'general'.
const PERSONA_OPTIONS: Array<{ account: AccountType; persona: Persona; label: string; desc: string }> = [
	{ account: 'founder', persona: 'founder', label: 'Founder', desc: 'Fundraising Copilot — investor matches, benchmarks, your raise.' },
	{ account: 'investor', persona: 'investor', label: 'Investor', desc: 'Dealflow Copilot — sourcing, thesis, diligence.' },
	{ account: 'user', persona: 'general', label: 'Just exploring', desc: 'The classic intelligence hub, no persona workspace.' },
];

function ProfileTab() {
	const { data: profile } = useUserProfile();
	const { mutate } = useSWRConfig();
	const { setPersona } = usePersona();
	const [form, setForm] = useState({
		full_name: '',
		display_name: '',
		job_title: '',
		company_name: '',
		avatar_url: '',
		account_type: 'user' as AccountType,
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (profile) {
			setForm({
				full_name: profile.full_name ?? '',
				display_name: profile.display_name ?? '',
				job_title: profile.job_title ?? '',
				company_name: profile.company_name ?? '',
				avatar_url: profile.avatar_url ?? '',
				account_type: (profile.account_type as AccountType) ?? 'user',
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
			// Reflect the persona switch immediately in the topbar/sidebar workspace.
			const opt = PERSONA_OPTIONS.find((o) => o.account === form.account_type);
			if (opt) setPersona(opt.persona);
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
				value={form.full_name}
				onChange={(v) => setForm((s) => ({ ...s, full_name: v }))}
			/>
			<Field
				label="Display name"
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
			{profile?.referral_code && (
				<div style={{ marginBottom: 14 }}>
					<div className="co-stat-label" style={{ marginBottom: 6 }}>Referral code</div>
					<div style={{ display: 'flex', gap: 8 }}>
						<input className="search-input" style={{ flex: 1, fontFamily: 'var(--font-mono)' }} value={profile.referral_code} readOnly />
						<button className="btn ghost" onClick={() => { void navigator.clipboard?.writeText(profile.referral_code ?? ''); toast.success('Referral code copied'); }}>Copy</button>
					</div>
				</div>
			)}

			<div className="co-stat-label" style={{ marginTop: 18, marginBottom: 8 }}>I am a…</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{PERSONA_OPTIONS.map((o) => {
					const on = form.account_type === o.account;
					return (
						<button
							key={o.account}
							onClick={() => setForm((s) => ({ ...s, account_type: o.account }))}
							className={`btn ${on ? '' : 'ghost'}`}
							style={{ height: 'auto', padding: '12px 14px', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left' }}
						>
							<span style={{ fontWeight: 700, fontSize: 13 }}>{o.label}</span>
							<span style={{ fontSize: 11, opacity: 0.75, fontWeight: 400 }}>{o.desc}</span>
						</button>
					);
				})}
			</div>
			<p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
				Sets your workspace. You can also switch temporarily from the top bar.
			</p>

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
	const [currency, setCurrencyState] = useState<string>('USD');
	const [region, setRegionState] = useState<string>('Global');

	useEffect(() => {
		const initial = getComputedStyle(document.documentElement).getPropertyValue('--accent-hue').trim();
		const parsed = Number(initial);
		if (Number.isFinite(parsed) && parsed > 0) setAccentHue(parsed);
		const d = document.documentElement.getAttribute('data-density');
		if (d === 'comfortable' || d === 'compact') setDensityState(d);
		try {
			const c = localStorage.getItem('stx:currency');
			if (c) setCurrencyState(c);
			const r = localStorage.getItem('stx:region');
			if (r) setRegionState(r);
		} catch { /* ignore */ }
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

	const setCurrency = (c: string) => {
		setCurrencyState(c);
		try {
			localStorage.setItem('stx:currency', c);
		} catch { /* ignore */ }
	};

	const setRegion = (r: string) => {
		setRegionState(r);
		try {
			localStorage.setItem('stx:region', r);
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

			<div className="co-stat-label" style={{ marginBottom: 10 }}>Currency · Region</div>
			<div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
				<select
					className="search-input"
					value={currency}
					onChange={(e) => setCurrency(e.target.value)}
					style={{ flex: 1 }}
				>
					<option value="USD">USD ($)</option>
					<option value="EUR">EUR (€)</option>
					<option value="GBP">GBP (£)</option>
				</select>
				<select
					className="search-input"
					value={region}
					onChange={(e) => setRegion(e.target.value)}
					style={{ flex: 1 }}
				>
					<option value="Global">Global</option>
					<option value="North America">North America</option>
					<option value="Europe">Europe</option>
					<option value="APAC">APAC</option>
				</select>
			</div>
		</div>
	);
}

function NotificationsTab() {
	const { data: profile } = useUserProfile();
	const { mutate } = useSWRConfig();
	const [pending, setPending] = useState<string | null>(null);

	// Design's domain-specific alert toggles (ui_design/screens-3.jsx). Each is
	// backed by a dedicated `notification_*` profile column.
	const items: Array<{
		key: 'notification_newsletter' | 'notification_funding_alerts' | 'notification_ma_alerts' | 'notification_report_releases' | 'notification_programs_deadline' | 'notification_email' | 'notification_marketing' | 'notification_updates';
		l: string;
		desc: string;
	}> = [
		{ key: 'notification_newsletter',       l: 'Newsletter',       desc: 'Every Friday — top deals, M&A, and market signals.' },
		{ key: 'notification_funding_alerts',   l: 'Funding alerts',   desc: 'New funding rounds in the sectors and companies you follow.' },
		{ key: 'notification_ma_alerts',        l: 'M&A alerts',       desc: 'Acquisitions and mergers as they’re announced.' },
		{ key: 'notification_report_releases',  l: 'Report releases',  desc: 'When a new market report or deep-dive is published.' },
		{ key: 'notification_programs_deadline', l: 'Program deadlines', desc: 'Reminders before accelerator and program application deadlines.' },
		{ key: 'notification_email',            l: 'Email notifications', desc: 'Account and activity emails, including saved-search digests.' },
		{ key: 'notification_updates',          l: 'Product updates',  desc: 'New features and improvements to the platform.' },
		{ key: 'notification_marketing',        l: 'Marketing',        desc: 'Occasional offers and announcements from SportsTechX.' },
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

function WorkspaceTab() {
	const { data: profile } = useUserProfile();
	const { mutate } = useSWRConfig();
	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);
	const [region, setRegionState] = useState('Global');
	const [currency, setCurrencyState] = useState('USD');

	useEffect(() => {
		if (profile) setName(profile.company_name ?? '');
	}, [profile]);

	useEffect(() => {
		try {
			const r = localStorage.getItem('stx:region'); if (r) setRegionState(r);
			const c = localStorage.getItem('stx:currency'); if (c) setCurrencyState(c);
		} catch { /* ignore */ }
	}, []);

	const setRegion = (r: string) => {
		setRegionState(r);
		try { localStorage.setItem('stx:region', r); } catch { /* ignore */ }
	};
	const setCurrency = (c: string) => {
		setCurrencyState(c);
		try { localStorage.setItem('stx:currency', c); } catch { /* ignore */ }
	};

	// Workspace name is persisted onto the profile's company_name (the workspace
	// is single-tenant per account until the team module ships).
	const saveName = async () => {
		setSaving(true);
		try {
			await apiRequest('PATCH', '/api/profiles/me', { company_name: name });
			toast.success('Workspace updated');
			void mutate(qk.profile());
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not save');
		} finally {
			setSaving(false);
		}
	};

	const memberName = profile?.display_name || profile?.email || 'You';
	const initials = memberName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
				Workspace
			</h3>
			<p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 24 }}>
				Your workspace name, defaults, and team members.
			</p>

			<Field label="Workspace name" value={name} onChange={setName} />
			<button className="btn" style={{ marginBottom: 24 }} disabled={saving} onClick={() => void saveName()}>
				{saving ? 'Saving…' : 'Save'}
			</button>

			<div className="co-stat-label" style={{ marginBottom: 10 }}>Default region · currency</div>
			<div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
				<select className="search-input" value={region} onChange={(e) => setRegion(e.target.value)} style={{ flex: 1 }}>
					<option value="Global">Global</option>
					<option value="North America">North America</option>
					<option value="Europe">Europe</option>
					<option value="APAC">APAC</option>
				</select>
				<select className="search-input" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ flex: 1 }}>
					<option value="USD">USD ($)</option>
					<option value="EUR">EUR (€)</option>
					<option value="GBP">GBP (£)</option>
				</select>
			</div>

			<div className="co-stat-label" style={{ marginBottom: 10 }}>Members</div>
			<div
				style={{
					display: 'flex', alignItems: 'center', gap: 12,
					padding: '12px 0', borderBottom: '1px solid var(--border)',
				}}
			>
				{profile?.avatar_url ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img src={profile.avatar_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', background: 'var(--bg-2)' }} />
				) : (
					<div style={{ width: 32, height: 32, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-display)' }}>
						{initials}
					</div>
				)}
				<div style={{ flex: 1 }}>
					<div style={{ fontWeight: 600, fontSize: 14 }}>{memberName}</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{profile?.email}</div>
				</div>
				<Tag>Owner</Tag>
			</div>
			<button className="btn ghost" style={{ marginTop: 16 }} disabled title="Team invites are coming soon">
				Invite teammates
			</button>
		</div>
	);
}

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
	const { data: keys } = useSWR<Array<{ id: string }>>(qk.apiKeys.list());
	const count = keys?.length ?? 0;
	return (
		<div>
			<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
				API & integrations
			</h3>
			<div className="co-stat-label" style={{ marginBottom: 8 }}>Personal API keys</div>
			<div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
				<input
					className="search-input"
					style={{ flex: 1 }}
					value={`${count} active key${count === 1 ? '' : 's'}`}
					readOnly
				/>
				<Link href="/api-keys"><button className="btn ghost">Manage keys</button></Link>
			</div>
			<div className="co-stat-label" style={{ marginBottom: 8 }}>CRM connections</div>
			<div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
				<div style={{ fontSize: 13, color: 'var(--fg-2)', maxWidth: 360 }}>
					Connect a CRM (Attio, HubSpot, Salesforce, Google Sheets) to sync companies,
					deal flow, investors and more. Syncs use export credits — 1 per row.
				</div>
				<Link href="/integrations"><button className="btn ghost">Manage connections</button></Link>
			</div>
		</div>
	);
}

function BillingTab() {
	const { data: profile } = useUserProfile();
	const { mutate } = useSWRConfig();
	const tier = (profile?.user_type ?? 'free').toLowerCase();
	const isFree = tier === 'free';
	const [syncing, setSyncing] = useState(false);

	// Free-tier users have no Stripe customer → /invoices returns []. Suppress
	// the fetch entirely to avoid the network round-trip + flicker.
	const { data: invoices, isLoading: invoicesLoading } = useSWR<StripeInvoice[]>(
		isFree ? null : qk.billing.invoices(),
		{ dedupingInterval: 5 * 60_000 },
	);
	const list = invoices ?? [];

	const handleSync = async () => {
		setSyncing(true);
		try {
			const res = await apiRequest('POST', '/api/billing/sync', {});
			const data = (await res.json()) as {
				status: 'ok' | 'no_customer';
				customer_id: string | null;
				subscriptions_synced: number;
				orphans_deactivated: number;
			};
			// Refresh every cache touched by a possible tier change.
			await Promise.all([
				mutate(qk.profile()),
				mutate(qk.billing.subscription()),
				mutate(qk.billing.invoices()),
			]);
			if (data.status === 'no_customer') {
				toast.info("No Stripe customer found for your account — nothing to sync.");
			} else if (data.subscriptions_synced === 0 && data.orphans_deactivated === 0) {
				toast.success('Already in sync with Stripe.');
			} else {
				const parts: string[] = [];
				if (data.subscriptions_synced > 0) parts.push(`${data.subscriptions_synced} subscription${data.subscriptions_synced === 1 ? '' : 's'} synced`);
				if (data.orphans_deactivated > 0) parts.push(`${data.orphans_deactivated} stale row${data.orphans_deactivated === 1 ? '' : 's'} deactivated`);
				toast.success(parts.join(' · '));
			}
		} catch (e) {
			toast.error((e as Error).message ?? 'Sync failed.');
		} finally {
			setSyncing(false);
		}
	};

	return (
		<div>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
				<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: 0 }}>
					Billing
				</h3>
				<button
					className="btn ghost"
					onClick={() => void handleSync()}
					disabled={syncing}
					title="Re-fetch your subscription state from Stripe — useful if a payment webhook didn't reach us"
				>
					{syncing
						? <><Loader2 size={12} className="animate-spin" /> Syncing…</>
						: <><RefreshCw size={12} /> Sync with Stripe</>}
				</button>
			</div>
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
			<div className="co-stat-label" style={{ marginBottom: 8 }}>Credits</div>
			<div style={{ marginBottom: 16 }}>
				<CreditMeter variant="card" />
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
