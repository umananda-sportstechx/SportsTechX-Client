'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, PageHead, PlaceholderTag } from '@/components/atlas';
import { FundFields, StageFields, GeographyFields, SectorFields, AttributeFields } from './thesis-form';
import { useThesis } from './use-thesis';
import type { Thesis } from './sample-data';

/** Thesis settings (Claude Design "Thesis settings") — Backend Not Connected: saved in this browser only. */
export function ThesisSettings() {
	const [saved, save] = useThesis();
	const [draft, setDraft] = useState<Thesis | null>(null);
	const t = draft ?? saved;
	const patch = (p: Partial<Thesis>) => setDraft({ ...t, ...p });
	const dirty = draft !== null;

	return (
		<>
			<PageHead title={<>Thesis settings<PlaceholderTag /></>} sub="Tell Atlas what you're looking for." />
			<div className="scout-stack">
				<Section title="Fund profile"><FundFields t={t} patch={patch} /></Section>
				<Section title="Stage and cheque size"><StageFields t={t} patch={patch} /></Section>
				<Section title="Geography" sub="Regions and countries where you actively invest."><GeographyFields t={t} patch={patch} /></Section>
				<Section title="Sectors" sub="Based on the SportsTechX Framework."><SectorFields t={t} patch={patch} /></Section>
				<Section title="Attributes" sub="Traction, sports and the attributes you look for or avoid."><AttributeFields t={t} patch={patch} /></Section>
				<div className="scout-savebar">
					<Button disabled={!dirty} onClick={() => { save(t); setDraft(null); toast.success('Thesis saved'); }}>{dirty ? 'Save thesis' : 'Saved'}</Button>
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
