'use client';

import { useState } from 'react';
import { Check, Sparkles, Plus } from 'lucide-react';
import { Page, SectionHead } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';

/**
 * InvestorThesis (i-thesis) — the pre-filled, confirmable thesis that powers
 * matching. Demo-grade sample data; `confirmed` is local UI state.
 */

const SECTORS = ['Fan Engagement', 'Performance', 'Media & Streaming'];
const STAGES = ['Seed', 'Series A', 'Series B'];
const GEOS = ['North America', 'Europe'];
const EXCLUSIONS = ['Hardware-only', 'Pre-revenue'];

export default function InvestorThesisPage() {
	const [confirmed, setConfirmed] = useState(false);

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · My thesis"
				title="Your thesis, pre-filled."
				sub="We drafted this from the 18 deals you've actually backed. Confirm or adjust — it powers every match, alert and digest."
				action={
					confirmed ? (
						<span className="cp-confirmed"><Check size={15} /> Confirmed</span>
					) : (
						<button className="btn" onClick={() => setConfirmed(true)}><Check size={14} /> Confirm thesis</button>
					)
				}
			/>

			<div className="cp-thesis-src cp-thesis-src-page">
				<Sparkles size={13} /> Pre-filled from 18 backed deals · last reviewed {confirmed ? 'just now' : 'never'}
			</div>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Focus" />
					<div style={{ padding: 'var(--space-4)' }}>
						<ChipBlock label="Sectors" items={SECTORS} addable />
						<ChipBlock label="Stages" items={STAGES} addable />
						<ChipBlock label="Geographies" items={GEOS} addable />
					</div>
				</div>

				<div className="card">
					<SectionHead title="Parameters" />
					<div style={{ padding: 'var(--space-4)' }}>
						<div className="cp-thesis-edit">
							<div className="cp-thesis-edit-label">Cheque size</div>
							<div className="cp-thesis-edit-body"><b style={{ fontSize: 16 }}>$1M – $8M</b></div>
						</div>
						<div className="cp-thesis-edit">
							<div className="cp-thesis-edit-label">Exclusions</div>
							<div className="cp-thesis-edit-body">
								{EXCLUSIONS.map((e) => <span key={e} className="chip chip-ex">{e}</span>)}
							</div>
						</div>
						<div className="cp-thesis-edit">
							<div className="cp-thesis-edit-label">Lead preference</div>
							<div className="cp-thesis-edit-body"><b style={{ fontSize: 14 }}>Lead or co-lead · board seat</b></div>
						</div>
					</div>
				</div>
			</div>
		</Page>
	);
}

function ChipBlock({ label, items, addable }: { label: string; items: string[]; addable?: boolean }) {
	return (
		<div className="cp-thesis-edit">
			<div className="cp-thesis-edit-label">{label}</div>
			<div className="cp-thesis-edit-body">
				{items.map((it) => <span key={it} className="chip chip-on">{it}</span>)}
				{addable && <span className="chip chip-add"><Plus size={11} /> add</span>}
			</div>
		</div>
	);
}
