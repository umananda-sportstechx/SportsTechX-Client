'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PencilLine } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '@/components/atlas';
// Not re-exported from the barrel; the other two modal hosts import it this way.
import { Modal } from '@/components/atlas/patterns/modal';
import { apiRequest } from '@/lib/query-client';
import { useVerifyState } from './verify-cta';

/**
 * "Suggest a correction" — the ongoing edit path, after verification.
 *
 * Distinct from the corrections bundled into a claim submission: that is a
 * one-time snapshot taken while proving who you are. This is the standing
 * ability to fix a field whenever the record drifts, which is the half of the
 * flow that had endpoints (`POST /api/data-change-requests`) and no UI.
 *
 * Only rendered once the viewer holds a **verified** claim on this entity. The
 * server enforces the same rule and answers `NOT_VERIFIED_FOR_ENTITY`
 * otherwise — this just avoids offering a button that cannot work.
 */
const FIELDS: [value: string, label: string][] = [
	['website', 'Website'],
	['description', 'Description'],
	['hq_city', 'City'],
	['hq_country', 'Country'],
	['founded_year', 'Founded year'],
	['sector', 'Category'],
	['team', 'Team'],
	['funding', 'Funding history'],
	['other', 'Something else'],
];

export function SuggestCorrection({ companyId, companyName }: {
	companyId: string;
	companyName: string;
}) {
	const { state } = useVerifyState(companyName);
	const [open, setOpen] = useState(false);
	const [field, setField] = useState('website');
	const [current, setCurrent] = useState('');
	const [proposed, setProposed] = useState('');
	const [busy, setBusy] = useState(false);

	// Unverified viewers get the claim button instead; offering an edit form
	// that the API will refuse is worse than not offering it.
	if (state !== 'verified') return null;

	const submit = async () => {
		if (!proposed.trim()) { toast.error('Add the corrected value.'); return; }
		setBusy(true);
		try {
			const res = await apiRequest('POST', '/api/data-change-requests', {
				entity_type: 'company',
				target_company_id: companyId,
				target_name_snapshot: companyName,
				field_change: field,
				old_value: current.trim() || null,
				requested_value: proposed.trim(),
			});
			if (!res.ok) throw new Error(String(res.status));
			toast.success('Sent. The SportsTechX team will review it.');
			setOpen(false);
			setCurrent(''); setProposed('');
		} catch {
			toast.error("Couldn't send your correction. Please try again.");
		} finally { setBusy(false); }
	};

	return (
		<>
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
				<PencilLine size={13} aria-hidden="true" /> Suggest a correction
			</Button>
			<Modal
				open={open}
				onOpenChange={setOpen}
				icon={<PencilLine size={14} />}
				title={`Correct ${companyName}`}
				footer={
					<>
						<Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
						<Button size="sm" disabled={busy} onClick={() => void submit()}>
							{busy ? 'Sending…' : 'Send correction'}
						</Button>
					</>
				}
			>
				<Field label="What needs changing?">
					<Select value={field} onChange={(e) => setField(e.target.value)} options={FIELDS} />
				</Field>
				<Field label="Current value (optional)">
					<Input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="What it says now" />
				</Field>
				<Field label="Correct value">
					<Textarea value={proposed} onChange={(e) => setProposed(e.target.value)} rows={3} placeholder="What it should say" />
				</Field>
				<p style={{ fontSize: 12, color: 'var(--a-faint)', margin: '4px 0 0' }}>
					Changes appear on Atlas once the team has reviewed them.
				</p>
			</Modal>
		</>
	);
}
