'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button, Card, Loading, PageHead } from '@/components/atlas';
import { FundFields, StageFields, GeographyFields, SectorFields, AttributeFields } from './thesis-form';
import { useThesisState } from './use-thesis';
import type { Thesis } from './sample-data';

/**
 * Thesis settings. Persisted to the account through `PATCH /api/scout` and
 * `PUT /api/scout/thesis` — and it is the gate on `GET /scout/recommended`,
 * which answers 403 SCOUT_NOT_SET_UP until a workspace exists.
 *
 * Laid out like `app/(dashboard)/settings/page.tsx`, the Raise equivalent of
 * this page: `PageHead`, a stack of `Card` sections each with an inline title
 * over a hairline, and the save button on a row of its own. The two are the
 * same screen for different products and were drifting apart.
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

				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingBottom: 40 }}>
					<span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--a-muted)', maxWidth: 520 }}>
						Atlas uses your thesis to personalise company recommendations, signals, Deal Flow and alerts.
					</span>
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
					>{busy ? <Loader2 className="animate-spin" size={13} /> : dirty ? 'Save thesis' : 'Saved'}</Button>
				</div>
			</div>
		</>
	);
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
	return (
		<Card>
			<div style={{ paddingBottom: 14, marginBottom: 18, borderBottom: '1px solid var(--a-border)' }}>
				<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)' }}>{title}</div>
				{sub && <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--a-muted)' }}>{sub}</p>}
			</div>
			{children}
		</Card>
	);
}
