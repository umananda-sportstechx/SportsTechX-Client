'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/** Light/dark switch — compact icon button for the mobile top bar, labelled row for the sidebar. */
export function ThemeToggle({ compact, collapsed }: { compact?: boolean; collapsed?: boolean }) {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const isDark = resolvedTheme === 'dark';
	const toggle = () => setTheme(isDark ? 'light' : 'dark');
	const Icon = isDark ? Sun : Moon;

	if (compact) {
		return (
			<button className="atlas-hamburger" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
				{mounted ? <Icon size={19} strokeWidth={1.25} /> : <Moon size={19} strokeWidth={1.25} />}
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
