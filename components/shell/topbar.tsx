'use client';

import { Search, Sun, Moon, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';

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
 * SportsTechX topbar. Ported from ui_design/app/nav.jsx (Topbar).
 *
 * Layout (left → right):
 *   [search trigger]  [spacer]  [Live · N cos]  [theme toggle]  [AI toggle]  [avatar]
 *
 * The search button opens the command palette (Cmd+K). The avatar is rendered
 * from the user's display_name initials, falling back to email initial.
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
	const { data: profile } = useUserProfile();

	// Hydration-safe theme icon: render an empty placeholder during SSR, swap
	// to the correct icon after mount. Without this, the server can't know
	// the user's theme and renders a different icon than the client → React
	// hydration mismatch warning.
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);

	const initials = profile?.display_name
		? profile.display_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
		: profile?.email?.[0]?.toUpperCase() ?? 'U';

	return (
		<div className="topbar">
			<button className="cmd-trigger" onClick={onCmdOpen}>
				<Search size={14} />
				<span>Search companies, deals, investors…</span>
				<span className="kbd">⌘K</span>
			</button>
			<span className="topbar-spacer" />

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
				{mounted ? (
					theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />
				) : (
					<span style={{ width: 16, height: 16, display: 'inline-block' }} />
				)}
			</button>

			<button className={`topbar-btn ${aiOpen ? 'primary' : ''}`} onClick={onToggleAi}>
				<Sparkles size={14} /> AI
			</button>

			<div
				style={{
					width: 32,
					height: 32,
					background: 'var(--accent)',
					color: 'var(--accent-fg)',
					display: 'grid',
					placeItems: 'center',
					fontFamily: 'var(--font-display)',
					fontWeight: 700,
					fontSize: 13,
				}}
				aria-label="Profile"
				title={profile?.display_name ?? profile?.email ?? 'Profile'}
			>
				{initials}
			</div>
		</div>
	);
}
