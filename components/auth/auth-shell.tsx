'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Loader2, Moon, Sun } from 'lucide-react';
import { AtlasLogo } from '@/components/atlas';
import type { ReactNode } from 'react';
import './auth.css';

/**
 * The shared frame for the pre-login screens.
 *
 * There was none before: login, signup, and forgot/reset each built their own,
 * on three different palettes. The split layout is from the Scout v2 signup
 * mockup; `panel` is what fills the left half — the value props on signup, the
 * testimonial rail on login.
 *
 * `.atlas` comes from `app/(auth)/layout.tsx`, which is what makes `--a-*`
 * resolve. These components assume it is above them.
 */
export function AuthSplit({ panel, children }: { panel?: ReactNode; children: ReactNode }) {
	return (
		<div className={`auth-split${panel ? ' auth-split--panelled' : ''}`}>
			{panel}
			<div className="auth-form-col">
				<div className="auth-form">
					<AuthBrand />
					{children}
				</div>
			</div>
		</div>
	);
}

/**
 * "Atlas / by SportsTechX" lockup.
 *
 * `AtlasLogo` is the same wordmark the mockup's panel uses, and it is inline SVG
 * inheriting `currentColor` — unlike `Brand`, which would pull a 67 KB PNG onto
 * a pre-login page. It sits in the form column rather than the panel because the
 * panel is hidden below 1024px and the branding should survive that.
 */
export function AuthBrand() {
	return (
		<div className="auth-brand">
			<AtlasLogo height={27} />
			<span className="auth-brand__by">by SportsTechX</span>
		</div>
	);
}

/** Headline + numbered value rows — the mockup's left panel on signup. */
export function AuthValuePanel({ headline, points }: { headline: string; points: string[] }) {
	return (
		<aside className="auth-panel">
			<h2 className="auth-panel__head">{headline}</h2>
			<div className="auth-points">
				{points.map((p, i) => (
					<div className="auth-points__row" key={p}>
						<span className="auth-points__n">{String(i + 1).padStart(2, '0')}</span>
						<span className="auth-points__t">{p}</span>
					</div>
				))}
			</div>
		</aside>
	);
}

/** Error / success banner. Both auth pages had their own inline copy of this. */
export function AuthNotice({ tone, children, action }: {
	tone: 'error' | 'ok';
	children: ReactNode;
	/** Optional button under the message, e.g. "Resend confirmation email". */
	action?: ReactNode;
}) {
	return (
		<div className={`auth-notice auth-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
			{children}
			{action && <div className="auth-notice__action">{action}</div>}
		</div>
	);
}

/** Hairline — OR — hairline, between the social buttons and the email form. */
export function AuthOr() {
	return <div className="auth-or"><span>OR</span></div>;
}

/** Spinner sized for an `.atlas-btn` (components.css sizes svg children to 13px). */
export function AuthSpinner() {
	return <Loader2 className="animate-spin" aria-hidden="true" />;
}

/**
 * Light/dark toggle. The app's toggle lives in the shell, which no pre-login
 * page renders, so without this a visitor is stuck on whatever theme they have.
 */
export function AuthThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const isDark = resolvedTheme === 'dark';
	return (
		<button
			type="button"
			className="auth-theme"
			aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
			onClick={() => setTheme(isDark ? 'light' : 'dark')}
		>
			{mounted && (isDark ? <Sun size={15} /> : <Moon size={15} />)}
		</button>
	);
}
