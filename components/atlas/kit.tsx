'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import './atlas.css';

/**
 * Atlas UI kit — the fresh founder-workspace components (raise mock-ups). Small,
 * self-contained, styled by atlas.css. Pages compose these instead of the legacy
 * .card/.btn design system. Keep it minimal; add pieces only when a screen needs them.
 */

export function cx(...parts: (string | false | null | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}

// ── Layout ──────────────────────────────────────────────────────────────────
/** Padded content wrapper — the founder shell's content region has no padding. */
export function Screen({ children, width = 1180 }: { children: ReactNode; width?: number }) {
	return <div style={{ padding: '32px 40px', maxWidth: width }}>{children}</div>;
}
export function Loading() {
	return <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}><Loader2 className="spin" size={22} /></div>;
}
export function Empty({ children }: { children: ReactNode }) {
	return <div className="atlas-card" style={{ textAlign: 'center', color: 'var(--a-muted)', fontSize: 14, padding: 28 }}>{children}</div>;
}

// ── Text ──────────────────────────────────────────────────────────────────
export function H1({ children, className }: { children: ReactNode; className?: string }) {
	return <h1 className={cx('atlas-h1', className)}>{children}</h1>;
}
export function H2({ children, className }: { children: ReactNode; className?: string }) {
	return <h2 className={cx('atlas-h2', className)}>{children}</h2>;
}
export function Sub({ children }: { children: ReactNode }) { return <p className="atlas-sub">{children}</p>; }
export function Eyebrow({ children }: { children: ReactNode }) { return <div className="atlas-eyebrow">{children}</div>; }

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, variant, focus, className, style }: {
	children: ReactNode; variant?: 'cream'; focus?: boolean; className?: string; style?: React.CSSProperties;
}) {
	return (
		<div className={cx('atlas-card', variant === 'cream' && 'atlas-card--cream', focus && 'atlas-card--focus', className)} style={style}>
			{children}
		</div>
	);
}

// ── Button (button or link) ────────────────────────────────────────────────
type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm'; href?: undefined };
type LinkBtnProps = { variant?: BtnVariant; size?: 'sm'; href: string; children: ReactNode; className?: string };

export function Button(props: ButtonProps | LinkBtnProps) {
	const { variant = 'primary', size, className, children } = props as LinkBtnProps & ButtonProps;
	const cls = cx('atlas-btn', `atlas-btn--${variant}`, size === 'sm' && 'atlas-btn--sm', className);
	if ('href' in props && props.href) {
		return <Link href={props.href} className={cls}>{children}</Link>;
	}
	const { variant: _v, size: _s, className: _c, href: _h, ...rest } = props as ButtonProps & { href?: string };
	return <button className={cls} {...rest}>{children}</button>;
}

// ── Fields ────────────────────────────────────────────────────────────────
export function Field({ label, children }: { label?: string; children: ReactNode }) {
	return <div>{label && <label className="atlas-label">{label}</label>}{children}</div>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={cx('atlas-input', props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea {...props} className={cx('atlas-textarea', props.className)} />;
}
export function Select({ options, placeholder, ...props }: SelectHTMLAttributes<HTMLSelectElement> & {
	options: [string, string][]; placeholder?: string;
}) {
	return (
		<select {...props} className={cx('atlas-select', props.className)}>
			{placeholder !== undefined && <option value="">{placeholder}</option>}
			{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
		</select>
	);
}
export function ReadOnly({ label, value, note }: { label?: string; value: ReactNode; note?: string }) {
	return (
		<Field label={label}>
			<div className="atlas-input atlas-input--readonly" style={{ display: 'flex', alignItems: 'center' }}>{value}</div>
			{note && <div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 4 }}>{note}</div>}
		</Field>
	);
}

// ── Badge ─────────────────────────────────────────────────────────────────
type Tone = 'neutral' | 'navy' | 'ok' | 'warn' | 'danger';
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
	return <span className={cx('atlas-badge', `atlas-badge--${tone}`)}>{children}</span>;
}

// ── Tabs ──────────────────────────────────────────────────────────────────
export function Tabs<T extends string>({ tabs, value, onChange }: {
	tabs: { key: T; label: string }[]; value: T; onChange: (k: T) => void;
}) {
	return (
		<div className="atlas-tabs">
			{tabs.map((t) => (
				<button key={t.key} className={cx('atlas-tab', t.key === value && 'active')} onClick={() => onChange(t.key)}>{t.label}</button>
			))}
		</div>
	);
}

// ── Stat tile ─────────────────────────────────────────────────────────────
export function Stat({ label, value }: { label: string; value: ReactNode }) {
	return <div className="atlas-stat"><div className="atlas-stat__label">{label}</div><div className="atlas-stat__value">{value}</div></div>;
}

// ── Progress ──────────────────────────────────────────────────────────────
export function Progress({ pct }: { pct: number }) {
	return <div className="atlas-progress"><div className="atlas-progress__fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}
