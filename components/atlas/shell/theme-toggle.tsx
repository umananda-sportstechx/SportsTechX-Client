'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/**
 * Light/dark switch — compact icon button for the mobile top bar, a row inside
 * the navbar's account menu, or a labelled sidebar row.
 *
 * Three shapes rather than three components: the `mounted` guard below is the
 * whole reason this exists (SSR has no theme, so rendering the real icon first
 * paint is a hydration mismatch), and that is not worth copying per variant.
 */
export function ThemeToggle({ compact, menu, collapsed, header }: { compact?: boolean; menu?: boolean; collapsed?: boolean; header?: boolean }) {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const isDark = resolvedTheme === 'dark';
	const toggle = () => setTheme(isDark ? 'light' : 'dark');
	const Icon = isDark ? Sun : Moon;

	if (header) {
		return (
			<button type="button" className="atlas-navbar__iconbtn" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} title={isDark ? 'Light mode' : 'Dark mode'} onClick={toggle}>
				{mounted ? <Icon size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
			</button>
		);
	}
	if (compact) {
		return (
			<button className="atlas-hamburger" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
				{mounted ? <Icon size={19} strokeWidth={1.25} /> : <Moon size={19} strokeWidth={1.25} />}
			</button>
		);
	}
	if (menu) {
		return (
			<button type="button" className="atlas-menu__item atlas-menu__item--plain" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
				{mounted ? <Icon size={13} strokeWidth={1.5} /> : <Moon size={13} strokeWidth={1.5} />}
				{mounted && isDark ? 'Light mode' : 'Dark mode'}
			</button>
		);
	}
	return (
		<button className="atlas-nav-item" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} title={collapsed ? (isDark ? 'Lightmode' : 'Darkmode') : undefined} onClick={toggle}>
			{mounted ? <Icon size={17} strokeWidth={1.25} /> : <Moon size={17} strokeWidth={1.25} />}
			<span className="atlas-nav-label">{mounted && isDark ? 'Lightmode' : 'Darkmode'}</span>
		</button>
	);
}
