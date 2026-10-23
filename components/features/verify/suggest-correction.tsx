'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PencilLine } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '@/components/atlas';
import { LocationSelect } from '@/components/features/location/location-select';
import { CityInput } from '@/components/features/location/city-input';
import { Modal } from '@/components/atlas/patterns/modal';
import { apiRequest } from '@/lib/query-client';
import { useVerifyState } from './verify-cta';

export interface CorrectionData {
	website: string;
	description: string;
	hq_city: string;
	hq_country: string;
	founded_year: string;
	sector: string;
	business_model: string;
	other: string;
}

const LABELS: Record<keyof CorrectionData, string> = {
	website: 'Website',
	description: 'Description',
	hq_city: 'City',
	hq_country: 'Country',
	founded_year: 'Founded year',
	sector: 'Category',
	business_model: 'Business model',
	other: 'Other notes',
};

const FIELD_MAP: Record<string, string> = {
	website: 'Website',
	description: 'Description',
	hq_city: 'City',
	hq_country: 'Country',
	founded_year: 'Founded',
	sector: 'Sector',
	business_model: 'Business_Model',
	other: 'other',
};

const BM_OPTIONS: [string, string][] = [
	['B2B', 'B2B'],
	['B2C', 'B2C'],
	['B2B2C', 'B2B2C'],
	['D2C', 'D2C'],
	['B2G', 'B2G'],
];

export function SuggestCorrection({ companyId, companyName, current }: {
	companyId: string;
	companyName: string;
	current: Partial<CorrectionData>;
}) {
	const { state } = useVerifyState(companyId);
	const [open, setOpen] = useState(false);
	const [values, setValues] = useState<Partial<CorrectionData>>({});
	const [busy, setBusy] = useState(false);

	if (state !== 'verified') return null;

	const set = (k: keyof CorrectionData, v: string) => setValues((prev) => ({ ...prev, [k]: v }));
	const init = () => {
		setValues({
			website: current.website ?? '',
			description: current.description ?? '',
			hq_city: current.hq_city ?? '',
			hq_country: current.hq_country ?? '',
			founded_year: current.founded_year ?? '',
			sector: current.sector ?? '',
			business_model: current.business_model ?? '',
			other: '',
		});
		setOpen(true);
	};

	const changed = Object.entries(values).filter(([k, v]) => {
		if (k === 'other') return !!v?.trim();
		const a = (v ?? '').trim();
		const b = (current[k as keyof CorrectionData] ?? '').trim();
		if (k === 'business_model') return a.toLowerCase() !== b.toLowerCase();
		return a !== b;
	});

	const submit = async () => {
		if (changed.length === 0) { toast.error('No changes to submit.'); return; }
		setBusy(true);
		try {
			for (const [field, proposed] of changed) {
				await apiRequest('POST', '/api/data-change-requests', {
					entity_type: 'company',
					target_company_id: companyId,
					target_name_snapshot: companyName,
					field_change: FIELD_MAP[field] ?? field,
					old_value: (current[field as keyof CorrectionData] ?? '').trim() || null,
					requested_value: (proposed ?? '').trim(),
				});
			}
			toast.success(`Sent ${changed.length} correction${changed.length > 1 ? 's' : ''}. The team will review.`);
			setOpen(false);
		} catch {
			toast.error("Couldn't send corrections. Please try again.");
		} finally { setBusy(false); }
	};

	return (
		<>
			<Button size="sm" variant="outline" onClick={init}>
				<PencilLine size={13} aria-hidden="true" /> Suggest a correction
			</Button>
			<Modal
				open={open}
				onOpenChange={setOpen}
				icon={<PencilLine size={14} />}
				title={`Correct ${companyName}`}
				width={640}
				nonModal
				footer={
					<>
						<Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
						<Button size="sm" disabled={busy || changed.length === 0} onClick={() => void submit()}>
							{busy ? 'Sending...' : changed.length > 0 ? `Send ${changed.length} correction${changed.length > 1 ? 's' : ''}` : 'Send correction'}
						</Button>
					</>
				}
			>
				<p style={{ fontSize: 12, color: 'var(--a-muted)', margin: '0 0 16px' }}>
					Edit any field below. Only changed fields are submitted for review.
				</p>
				<div style={{ maxHeight: 'min(60vh, 480px)', overflowY: 'auto', paddingRight: 4 }}>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
						<Field label={LABELS.website}>
							<Input type="url" value={values.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://example.com" />
						</Field>
						<Field label={LABELS.founded_year}>
							<Input type="number" min={1900} max={2030} inputMode="numeric" value={values.founded_year ?? ''} onChange={(e) => set('founded_year', e.target.value)} placeholder="e.g. 2021" />
						</Field>
						<div style={{ gridColumn: '1 / -1' }}>
							<Field label={LABELS.description}>
								<Textarea value={values.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Company description" />
							</Field>
						</div>
						<Field label={LABELS.hq_country}>
							<LocationSelect value={values.hq_country ?? ''} onChange={(v) => set('hq_country', v)} placeholder="Select country" />
						</Field>
						<Field label={LABELS.hq_city}>
							<CityInput value={values.hq_city ?? ''} onChange={(v) => set('hq_city', v)} onPick={(h) => { if (h.country) set('hq_country', h.country); }} placeholder="City name" geo={values.hq_country ?? ''} />
						</Field>
						<Field label={LABELS.sector}>
							<Input value={values.sector ?? ''} onChange={(e) => set('sector', e.target.value)} placeholder="Category" />
						</Field>
						<Field label={LABELS.business_model}>
							<Select
								options={BM_OPTIONS}
								placeholder="Select model"
								value={values.business_model?.toUpperCase() ?? ''}
								onChange={(e) => set('business_model', (e.target as HTMLSelectElement).value)}
							/>
						</Field>
						<div style={{ gridColumn: '1 / -1' }}>
							<Field label={LABELS.other}>
								<Textarea value={values.other ?? ''} onChange={(e) => set('other', e.target.value)} rows={2} placeholder="Anything else that needs updating" />
							</Field>
						</div>
					</div>
				</div>
				<p style={{ fontSize: 11, color: 'var(--a-faint)', margin: '8px 0 0' }}>
					Changes appear on Atlas once the team has reviewed them.
				</p>
			</Modal>
		</>
	);
}
