'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Eye, EyeOff, Loader2, Moon, Sun } from 'lucide-react';
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

/**
 * Password input with a show/hide toggle and autofill support.
 *
 * Every auth password field was a bare `.atlas-input` with no way to reveal what
 * was typed and no `autocomplete`, so browsers couldn't offer to fill or save.
 * `labelAccessory` carries login's "Forgot password?" link in the label row.
 */
export function PasswordField({ id, label, value, onChange, placeholder, autoComplete, minLength = 8, labelAccessory }: {
	id: string;
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	autoComplete: 'current-password' | 'new-password';
	minLength?: number;
	labelAccessory?: ReactNode;
}) {
	const [show, setShow] = useState(false);
	return (
		<div>
			<div className="auth-field__row">
				<label htmlFor={id} className="atlas-label">{label}</label>
				{labelAccessory}
			</div>
			<div className="auth-pw">
				<input
					id={id}
					type={show ? 'text' : 'password'}
					className="atlas-input auth-pw__input"
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					required
					minLength={minLength}
					autoComplete={autoComplete}
				/>
				<button
					type="button"
					className="auth-pw__toggle"
					aria-label={show ? 'Hide password' : 'Show password'}
					aria-pressed={show}
					onClick={() => setShow((s) => !s)}
					tabIndex={-1}
				>
					{show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
				</button>
			</div>
		</div>
	);
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
