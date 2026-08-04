'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { SidebarRail } from './sidebar-rail';
import { Topbar } from './topbar';
import { TickerStrip } from './ticker-strip';
import { AiPanel } from './ai-panel';
import { PaywallGate } from '@/components/paywall/paywall-gate';
import { CommandPalette } from './command-palette';
import { RaiseShell } from './raise-shell';

/**
 * Top-level shell that wraps every authenticated page with the SportsTechX
 * design system layout: rail (left) + main column (with ticker, topbar, and
 * scrollable content) + AI panel (optional, right-side drawer).
 *
 * Ported from ui_design/app/app.jsx. The CSS grid rules in
 * `app/design-system.css` (.app-shell, .app-shell.ai-open, .app-shell.rail-expanded)
 * drive the column-template based on which classes are present.
 *
 * State held here:
 *  - railExpanded:   collapsed (64px) vs expanded (220px) sidebar
 *  - aiOpen:         AI panel right drawer visibility
 *  - cmdOpen:        Cmd+K command palette overlay
 *  - showTicker:     ticker strip on/off (defaults on)
 *
 * Theme is delegated to next-themes which writes `class="dark"` to <html>;
 * design-system.css covers both `[data-theme="dark"]` (the prototype's
 * convention) and `.dark` (next-themes default) so both work.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	// `railExpanded` is the sticky click state (toggle by logo / chevron).
	// `railHovered` is the ephemeral pointer state — expanding the rail while
	// the cursor is over it, collapsing back when the cursor leaves. The two
	// are OR'd so a click-locked open stays open after the cursor leaves,
	// while a hover-only open snaps back when the cursor moves away.
	const [railExpanded, setRailExpanded] = useState(false);
	const [railHovered, setRailHovered] = useState(false);
	const railVisuallyExpanded = railExpanded || railHovered;
	const [aiOpen, setAiOpen] = useState(false);
	const [cmdOpen, setCmdOpen] = useState(false);
	const [showTicker, setShowTicker] = useState(true);

	const { resolvedTheme, setTheme } = useTheme();
	// Treat any non-light theme as dark for the topbar icon — keeps UX
	// stable while next-themes hydrates.
	const themeMode: 'dark' | 'light' = resolvedTheme === 'light' ? 'light' : 'dark';

	// The founder raise workspace uses its own clean shell (sidebar + content,
	// no topbar/ticker/AI), on the Atlas palette. Cmd+K and the paywall stay.
	const pathname = usePathname();
	const isRaiseWorkspace = pathname === '/raise' || pathname.startsWith('/raise/');

	// The Raise workspace is gated to the `raise` plan (admins bypass). Everyone
	// else (free / general / scout) is sent to the shared coming-soon page.
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const isAdmin = profile?.user_role === 'admin';
	const raiseAllowed = isAdmin || getUserType(profile) === 'raise';
	useEffect(() => {
		if (isRaiseWorkspace && profile && !raiseAllowed) router.replace('/coming-soon');
	}, [isRaiseWorkspace, profile, raiseAllowed, router]);

	// Cmd+K shortcut for the command palette.
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setCmdOpen((open) => !open);
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, []);

	// Cross-component event: command palette dispatches stx:open-ai when the
	// user picks the "Ask AI" row, opening the panel from anywhere.
	useEffect(() => {
		const handler = () => setAiOpen(true);
		window.addEventListener('stx:open-ai', handler);
		return () => window.removeEventListener('stx:open-ai', handler);
	}, []);

	const shellClasses = [
		'app-shell',
		railVisuallyExpanded ? 'rail-expanded' : '',
		aiOpen ? 'ai-open' : '',
	].filter(Boolean).join(' ');

	// Plan-agnostic surfaces (coming-soon placeholder + billing/subscriptions) —
	// rendered on the Atlas palette with no legacy chrome, reachable by any plan.
	if (pathname === '/coming-soon' || pathname.startsWith('/billing')) {
		return <div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}<PaywallGate /></div>;
	}

	if (isRaiseWorkspace) {
		// Gate to the raise plan: show a loader while the profile loads or while a
		// non-raise user is being redirected to /coming-soon.
		if (!profile || !raiseAllowed) {
			return <div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--a-page)' }}><Loader2 className="spin" size={22} /></div>;
		}
		// Founder-only shell — no legacy CommandPalette (its nav points at removed routes).
		return (
			<>
				<RaiseShell>{children}</RaiseShell>
				<PaywallGate />
			</>
		);
	}

	return (
		<div className={shellClasses}>
			<SidebarRail
				expanded={railVisuallyExpanded}
				onToggleExpand={() => setRailExpanded((v) => !v)}
				onHoverChange={setRailHovered}
			/>

			<main className="main-col">
				{showTicker && <TickerStrip />}
				<Topbar
					onCmdOpen={() => setCmdOpen(true)}
					aiOpen={aiOpen}
					onToggleAi={() => setAiOpen((v) => !v)}
					theme={themeMode}
					onToggleTheme={() => setTheme(themeMode === 'dark' ? 'light' : 'dark')}
				/>
				<div className="content-scroll">{children}</div>
			</main>

			<AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />
			<CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
			<PaywallGate />

			{/* Ticker toggle (hidden by default — wired up in tweaks panel later). */}
			<TickerToggleEffect onChange={setShowTicker} />
		</div>
	);
}

/** Listens for tweaks-panel events that turn the ticker on/off. */
function TickerToggleEffect({ onChange }: { onChange: (v: boolean) => void }) {
	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ value: boolean }>).detail;
			if (typeof detail?.value === 'boolean') onChange(detail.value);
		};
		window.addEventListener('stx:tweak-ticker', handler);
		return () => window.removeEventListener('stx:tweak-ticker', handler);
	}, [onChange]);
	return null;
}
