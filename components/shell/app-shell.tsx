'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { SidebarRail } from './sidebar-rail';
import { Topbar } from './topbar';
import { TickerStrip } from './ticker-strip';
import { AiPanel } from './ai-panel';
import { CommandPalette } from './command-palette';

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
	const [railExpanded, setRailExpanded] = useState(false);
	const [aiOpen, setAiOpen] = useState(false);
	const [cmdOpen, setCmdOpen] = useState(false);
	const [showTicker, setShowTicker] = useState(true);

	const { resolvedTheme, setTheme } = useTheme();
	// Treat any non-light theme as dark for the topbar icon — keeps UX
	// stable while next-themes hydrates.
	const themeMode: 'dark' | 'light' = resolvedTheme === 'light' ? 'light' : 'dark';

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
		railExpanded ? 'rail-expanded' : '',
		aiOpen ? 'ai-open' : '',
	].filter(Boolean).join(' ');

	return (
		<div className={shellClasses}>
			<SidebarRail
				expanded={railExpanded}
				onToggleExpand={() => setRailExpanded((v) => !v)}
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
