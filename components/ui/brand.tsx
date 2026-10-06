'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Brand — the SportsTechX wordmark/logo from /public.
 *
 * Renders exactly ONE image for the active theme: the BLACK logo on the light
 * theme, the WHITE logo on the dark theme. Uses next-themes' resolvedTheme
 * (deterministic, no CSS swap).
 *
 * Before mount the theme is unknown and the guess has to be a constant, or
 * hydration mismatches. It guesses **dark**, because that is the app's
 * `defaultTheme` (app/providers.tsx) with `enableSystem` off — so for most
 * users the first paint is already right. Guessing light meant the default
 * session painted the black wordmark, then swapped to white on mount, and
 * fetched *both* PNGs (67 KB + 74 KB) to show one.
 *
 * `horizontal` for wide surfaces (login, expanded sidebar); `mark` for the
 * square collapsed rail mark.
 */
export function Brand({
	variant = 'horizontal',
	height = 28,
	className,
}: {
	variant?: 'horizontal' | 'mark';
	height?: number;
	className?: string;
}) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const isDark = !mounted || resolvedTheme === 'dark';
	const src = variant === 'horizontal'
		? (isDark ? '/stx_white_horizontal.png' : '/stx_black_horizontal.png')
		: (isDark ? '/stx_white.png' : '/stx_black.png');

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt="SportsTechX"
			className={className}
			style={{ height, width: 'auto', display: 'block' }}
		/>
	);
}
