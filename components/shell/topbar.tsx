'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, Sparkles, ChevronRight, User, Settings, CreditCard, LogOut } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { GetVerifiedPill } from '@/components/get-verified/topbar-pill';

interface TopbarProps {
	onCmdOpen: () => void;
	aiOpen: boolean;
	onToggleAi: () => void;
	theme: 'dark' | 'light';
	onToggleTheme: () => void;
	/**
	 * Live count badge to the left of the icons (e.g. "Live · 8,160 cos").
	 * Optional — if omitted, the badge is hidden.
	 */
	liveLabel?: string;
}

/**
 * SportsTechX topbar. Ported from ui_design_3/app/nav.jsx (Topbar).
 *
 * Layout (left → right):
 *   [search trigger]  [spacer]  [Live · N cos]  [theme toggle]  [AI toggle]  [user chip ▾]
 *
 * The user chip opens an account dropdown (My account / Settings / Billing /
 * Log out). Unlike the prototype's demo plan-pill toggle, plan is shown
 * read-only and logout uses the real Supabase session.
 */
// PLACEHOLDER — prototype value, used when no real count is passed in. The
// number 8,160 mirrors `ui_design`'s hardcoded total companies count.
const DEFAULT_LIVE_LABEL = 'Live · 8,160 cos';

export function Topbar({
	onCmdOpen,
	aiOpen,
	onToggleAi,
	theme,
	onToggleTheme,
	liveLabel = DEFAULT_LIVE_LABEL,
}: TopbarProps) {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const [userOpen, setUserOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);
	const userRef = useRef<HTMLDivElement>(null);

	const initials = profile?.display_name
		? profile.display_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
		: profile?.email?.[0]?.toUpperCase() ?? 'U';
	const name = profile?.display_name ?? 'Your account';
	const email = profile?.email ?? '';
	const planLabel = (profile?.user_type ?? 'free').toUpperCase();

	useEffect(() => {
		if (!userOpen) return;
		const onDoc = (e: MouseEvent) => {
			if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
		};
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserOpen(false); };
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [userOpen]);

	const go = (path: string) => { setUserOpen(false); router.push(path); };

	const handleLogout = async () => {
		if (signingOut) return;
		setSigningOut(true);
		try {
			await getSupabaseBrowser().auth.signOut();
			router.push('/login');
		} catch {
			setSigningOut(false);
		}
	};

	const menu = [
		{ id: 'account', label: 'My account', sub: 'Profile & preferences', icon: User, path: '/settings' },
		{ id: 'settings', label: 'Settings', sub: 'Workspace & notifications', icon: Settings, path: '/settings' },
		{ id: 'billing', label: 'Billing & subscription', sub: `${planLabel} plan`, icon: CreditCard, path: '/subscriptions' },
	];

	return (
		<div className="topbar">
			<button className="cmd-trigger" onClick={onCmdOpen}>
				<Search size={14} />
				<span>Search companies, deals, investors…</span>
				<span className="kbd">⌘K</span>
			</button>
			<span className="topbar-spacer" />

			<GetVerifiedPill />

			{liveLabel && (
				<span
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
					}}
				>
					<span className="live-dot" />
					{liveLabel}
				</span>
			)}

			<button
				className="topbar-btn"
				onClick={onToggleTheme}
				title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
				aria-label="Toggle theme"
				suppressHydrationWarning
			>
				{/* Both icons rendered; CSS hides the inactive one. Avoids the */}
				{/* hydration flash from server-vs-client theme guess.            */}
				<Sun size={16} style={{ display: theme === 'dark' ? 'block' : 'none' }} suppressHydrationWarning />
				<Moon size={16} style={{ display: theme === 'dark' ? 'none' : 'block' }} suppressHydrationWarning />
			</button>

			<button className={`topbar-btn ${aiOpen ? 'primary' : ''}`} onClick={onToggleAi}>
				<Sparkles size={14} /> AI
			</button>

			<div className="user-menu-wrap" ref={userRef}>
				<button
					className={`user-chip ${userOpen ? 'open' : ''}`}
					onClick={() => setUserOpen((o) => !o)}
					aria-haspopup="menu"
					aria-expanded={userOpen}
					title="Account menu"
				>
					<span className="user-chip-avatar">{initials}</span>
					<ChevronRight
						size={12}
						style={{ transform: userOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
					/>
				</button>

				{userOpen && (
					<div className="user-menu" role="menu">
						<div className="user-menu-head">
							<div className="user-menu-avatar">{initials}</div>
							<div style={{ minWidth: 0 }}>
								<div className="user-menu-name">{name}</div>
								{email && <div className="user-menu-mail">{email}</div>}
								<div className="user-menu-plan">{planLabel}</div>
							</div>
						</div>
						<div className="user-menu-sep" />
						{menu.map((item) => {
							const Icon = item.icon;
							return (
								<button
									key={item.id}
									className="user-menu-row"
									role="menuitem"
									onClick={() => go(item.path)}
								>
									<span className="user-menu-icon"><Icon size={15} /></span>
									<span>
										<span className="user-menu-label">{item.label}</span>
										<span className="user-menu-sub">{item.sub}</span>
									</span>
								</button>
							);
						})}
						<div className="user-menu-sep" />
						<button
							className="user-menu-row danger"
							role="menuitem"
							onClick={handleLogout}
							disabled={signingOut}
						>
							<span className="user-menu-icon"><LogOut size={15} /></span>
							<span className="user-menu-label">Log out</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
