'use client';

import { useState } from 'react';
import { Field, Input } from '@/components/atlas';
import { ChipSet, AddButton, PickerDialog, toggleIn, withSelected } from './thesis-fields';
import { PILLAR_SECTORS, THESIS_OPTIONS, type Thesis } from './sample-data';

/**
 * Thesis field groups, shared by Thesis settings (all on one page) and the
 * onboarding steps (one or two groups per step). Each edits a slice of Thesis.
 */
type Patch = (p: Partial<Thesis>) => void;
interface Props { t: Thesis; patch: Patch }

const text = (t: Thesis, patch: Patch, key: keyof Thesis) => ({
	value: String(t[key] ?? ''),
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => patch({ [key]: e.target.value } as Partial<Thesis>),
});

export function ProfileFields({ t, patch }: Props) {
	return (
		<div className="scout-form-grid">
			<Field label="Full name"><Input {...text(t, patch, 'name')} placeholder="Your name" /></Field>
			<Field label="Work email"><Input type="email" {...text(t, patch, 'email')} placeholder="you@fund.com" /></Field>
			<Field label="Role"><Input {...text(t, patch, 'role')} placeholder="e.g. Partner" /></Field>
			<Field label="LinkedIn profile URL"><Input {...text(t, patch, 'linkedin')} placeholder="linkedin.com/in/…" /></Field>
		</div>
	);
}

export function FundFields({ t, patch }: Props) {
	return (
		<>
			<div className="scout-form-grid">
				<Field label="Fund / investor name"><Input {...text(t, patch, 'fundName')} placeholder="e.g. Northline Ventures" /></Field>
				<Field label="Website"><Input {...text(t, patch, 'website')} placeholder="fund.com" /></Field>
				<Field label="Location"><Input {...text(t, patch, 'location')} placeholder="City, country" /></Field>
			</div>
			<FieldBlock label="Investor type"><ChipSet options={THESIS_OPTIONS.investorType} value={t.investorType} onToggle={(o) => patch({ investorType: o })} /></FieldBlock>
			<FieldBlock label="Fund size / AUM"><ChipSet options={THESIS_OPTIONS.aum} value={t.aum} onToggle={(o) => patch({ aum: o })} /></FieldBlock>
		</>
	);
}

export function StageFields({ t, patch }: Props) {
	return (
		<>
			<FieldBlock label="Stages" hint="Select all that apply"><ChipSet options={THESIS_OPTIONS.stages} value={t.stages} onToggle={(o) => patch({ stages: toggleIn(t.stages, o) })} /></FieldBlock>
			<div className="scout-form-grid">
				<Field label="Typical cheque — minimum"><Input {...text(t, patch, 'chequeMin')} placeholder="e.g. €250k" /></Field>
				<Field label="Typical cheque — maximum"><Input {...text(t, patch, 'chequeMax')} placeholder="e.g. €2m" /></Field>
			</div>
			<FieldBlock label="Do you lead rounds?"><ChipSet options={[...THESIS_OPTIONS.invStyle]} value={t.invStyle} onToggle={(o) => patch({ invStyle: o as Thesis['invStyle'] })} /></FieldBlock>
		</>
	);
}

export function GeographyFields({ t, patch }: Props) {
	const [open, setOpen] = useState(false);
	return (
		<FieldBlock label="Regions" hint="Click a preset to select, or + Add for the full list">
			<div className="scout-chips">
				<ChipSet options={withSelected(THESIS_OPTIONS.regions, t.regions)} value={t.regions} onToggle={(o) => patch({ regions: toggleIn(t.regions, o) })} />
				<AddButton onClick={() => setOpen(true)} />
			</div>
			{open && <PickerDialog title="Add geography" sub="Continents, regions and countries you invest in." list="regions" selected={t.regions} onToggle={(o) => patch({ regions: toggleIn(t.regions, o) })} onClose={() => setOpen(false)} />}
		</FieldBlock>
	);
}

export function SectorFields({ t, patch }: Props) {
	return (
		<FieldBlock label="SportsTechX sectors" hint="Select all that apply">
			<div className="scout-pillars">
				{(Object.keys(PILLAR_SECTORS) as (keyof typeof PILLAR_SECTORS)[]).map((p) => (
					<div key={p} className="scout-pillar">
						<span className={`scout-pillar__pill scout-pillar__pill--${p.toLowerCase()}`}>{p}</span>
						<ChipSet wide options={PILLAR_SECTORS[p]} value={t.sectors} onToggle={(o) => patch({ sectors: toggleIn(t.sectors, o) })} />
					</div>
				))}
			</div>
		</FieldBlock>
	);
}

export function AttributeFields({ t, patch }: Props) {
	const [picker, setPicker] = useState<null | 'include' | 'exclude'>(null);
	// Picking an attribute on one side removes it from the other.
	const toggleSide = (side: 'include' | 'exclude', o: string) => {
		const other = side === 'include' ? 'exclude' : 'include';
		const adding = !t[side].includes(o);
		patch({ [side]: toggleIn(t[side], o), ...(adding ? { [other]: t[other].filter((x) => x !== o) } : {}) });
	};
	return (
		<>
			<FieldBlock label="Minimum traction"><ChipSet options={THESIS_OPTIONS.traction} value={t.traction} onToggle={(o) => patch({ traction: o })} /></FieldBlock>
			<FieldBlock label="Include" hint="Attributes and sports you look for">
				<div className="scout-chips">
					<ChipSet options={withSelected(THESIS_OPTIONS.include, t.include)} value={t.include} onToggle={(o) => toggleSide('include', o)} />
					<AddButton onClick={() => setPicker('include')} />
				</div>
			</FieldBlock>
			<FieldBlock label="Exclude" hint="Attributes you don’t invest in">
				<div className="scout-chips">
					<ChipSet options={withSelected(THESIS_OPTIONS.exclude, t.exclude)} value={t.exclude} onToggle={(o) => toggleSide('exclude', o)} />
					<AddButton onClick={() => setPicker('exclude')} />
				</div>
			</FieldBlock>
			{picker && (
				<PickerDialog
					title={picker === 'include' ? 'Include attributes' : 'Exclude attributes'}
					sub={picker === 'include' ? 'Attributes and sports you look for in a company.' : 'Attributes you don’t invest in.'}
					list="attrs" selected={t[picker]}
					blocked={t[picker === 'include' ? 'exclude' : 'include']} blockedNote={picker === 'include' ? 'Excluded' : 'Included'}
					onToggle={(o) => toggleSide(picker, o)} onClose={() => setPicker(null)}
				/>
			)}
		</>
	);
}

function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div className="scout-field">
			<div className="scout-field__label">{label}{hint && <span> · {hint}</span>}</div>
			{children}
		</div>
	);
}
