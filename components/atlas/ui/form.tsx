'use client';

import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

/** Form fields — mono uppercase labels, rounded inputs. Add `className="atlas-input--search"` for a pill search box. */

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
