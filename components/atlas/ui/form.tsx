'use client';

import { cloneElement, isValidElement, useId } from 'react';
import type { ChangeEvent, ReactElement, ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from './cx';
import { Combobox } from './combobox';
import { DatePicker } from './date-picker';

/** Form fields — mono uppercase labels, rounded inputs. Add `className="atlas-input--search"` for a pill search box. */

export function Field({ label, children }: { label?: string; children: ReactNode }) {
	const autoId = useId();
	// Tie the label to a single Atlas control (screen readers + click-to-focus).
	// Other children (button groups, read-only values) keep a plain label.
	const control = isValidElement<{ id?: string }>(children) && (children.type === Input || children.type === Select || children.type === Textarea || children.type === DatePicker)
		? (children as ReactElement<{ id?: string }>) : null;
	const id = control ? (control.props.id ?? autoId) : undefined;
	return (
		<div>
			{label && <label className="atlas-label" htmlFor={id}>{label}</label>}
			{control ? cloneElement(control, { id }) : children}
		</div>
	);
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={cx('atlas-input', props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea {...props} className={cx('atlas-textarea', props.className)} />;
}

export function Select({ options, placeholder, value, onChange, disabled, id, className, 'aria-label': ariaLabel }:
	SelectHTMLAttributes<HTMLSelectElement> & { options: [string, string][]; placeholder?: string }) {
	// Custom combobox, not a native <select> — same controlled contract, so the
	// call sites (all reading `e.target.value`) are untouched: we hand onChange a
	// minimal synthetic event. A provided placeholder becomes a selectable empty
	// option, exactly as the native empty <option> was, so "All …" stays reachable.
	const opts = placeholder !== undefined ? ([['', placeholder], ...options] as [string, string][]) : options;
	return (
		<Combobox
			options={opts}
			placeholder={placeholder ?? 'Select…'}
			value={value == null ? '' : String(value)}
			disabled={disabled}
			id={id}
			ariaLabel={ariaLabel}
			className={cx('atlas-select', className)}
			onChange={(v) => onChange?.({ target: { value: v }, currentTarget: { value: v } } as unknown as ChangeEvent<HTMLSelectElement>)}
		/>
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
