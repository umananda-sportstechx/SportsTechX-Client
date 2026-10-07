'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, Loading, PageHead } from '@/components/atlas';
import { FundFields, StageFields, GeographyFields, SectorFields, AttributeFields } from './thesis-form';
import { useThesisState } from './use-thesis';
import type { Thesis } from './sample-data';

/**
 * Thesis settings. Persisted to the account through `PATCH /api/scout` and
 * `PUT /api/scout/thesis` — and it is the gate on the rest of Scout, which
 * answers 403 SCOUT_NOT_SET_UP until the thesis exists.
 */
export function ThesisSettings() {
	const { thesis: saved, save, isLoading } = useThesisState();
	const [draft, setDraft] = useState<Thesis | null>(null);
	const [busy, setBusy] = useState(false);
	const t = draft ?? saved;
	const patch = (p: Partial<Thesis>) => setDraft({ ...t, ...p });
	const dirty = draft !== null;

	if (isLoading) return <Loading />;
	return (
		<>
			<PageHead title="Thesis settings" sub="Tell Atlas what you&apos;re looking for." />
			<div className="scout-stack">
				<Section title="Fund profile"><FundFields t={t} patch={patch} /></Section>
				<Section title="Stage and cheque size"><StageFields t={t} patch={patch} /></Section>
				<Section title="Geography" sub="Regions and countries where you actively invest."><GeographyFields t={t} patch={patch} /></Section>
				<Section title="Sectors" sub="Based on the SportsTechX Framework."><SectorFields t={t} patch={patch} /></Section>
				<Section title="Attributes" sub="Traction, sports and the attributes you look for or avoid."><AttributeFields t={t} patch={patch} /></Section>
				<div className="scout-savebar">
					<Button
					disabled={!dirty || busy}
					onClick={async () => {
						setBusy(true);
						try { await save(t); setDraft(null); toast.success('Thesis saved'); }
						// Clearing the draft on a failed save would lose the edits and
						// claim success, which is the worst of both.
						catch { toast.error('Could not save your thesis. Try again.'); }
						finally { setBusy(false); }
					}}
				>{busy ? 'Saving…' : dirty ? 'Save thesis' : 'Saved'}</Button>
					<span className="scout-muted">Atlas uses your thesis to personalise company recommendations, signals, Deal Flow and alerts.</span>
				</div>
			</div>
		</>
	);
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
	return (
		<Card className="scout-section">
			<div className="scout-section__head"><h2 className="atlas-h2">{title}</h2>{sub && <p className="scout-muted">{sub}</p>}</div>
			{children}
		</Card>
	);
}
