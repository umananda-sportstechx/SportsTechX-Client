'use client';

import { Screen, Badge } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';

/**
 * Atlas Raise — Resources (mock-up 15 / Notion "Resources"). Prepare → Connect →
 * Close framework, shown here without becoming platform navigation. v1 is a static
 * catalogue; item actions link to real content as it's produced.
 */
type Kind = 'Guide' | 'Template' | 'Checklist';
interface Item { title: string; desc: string; kind: Kind }
const GROUPS: { phase: string; blurb: string; items: Item[] }[] = [
	{
		phase: 'Prepare', blurb: 'Strengthen your pitch and get investor-ready.',
		items: [
			{ title: 'Pitch deck structure', desc: 'The slide-by-slide structure investors expect.', kind: 'Guide' },
			{ title: 'Fundraising-readiness checklist', desc: 'What to have in place before you start outreach.', kind: 'Checklist' },
			{ title: 'Financial-model guidance', desc: 'Building a model that stands up to diligence.', kind: 'Guide' },
			{ title: 'Market-sizing guidance', desc: 'Framing TAM/SAM credibly.', kind: 'Guide' },
			{ title: 'Investment-narrative guidance', desc: 'The story that ties the round together.', kind: 'Guide' },
		],
	},
	{
		phase: 'Connect', blurb: 'Find the right investors and organise your outreach.',
		items: [
			{ title: 'Investor target-list guidance', desc: 'Building and prioritising a target list.', kind: 'Guide' },
			{ title: 'Outreach email templates', desc: 'Cold and warm outreach that gets replies.', kind: 'Template' },
			{ title: 'Warm-introduction request', desc: 'Ask for intros without burning goodwill.', kind: 'Template' },
			{ title: 'Investor meeting guide', desc: 'Running a first investor meeting.', kind: 'Guide' },
			{ title: 'Follow-up templates', desc: 'Keeping momentum after the meeting.', kind: 'Template' },
			{ title: 'Watchlist-management guidance', desc: 'Keep your watchlist current, without busywork.', kind: 'Guide' },
		],
	},
	{
		phase: 'Close', blurb: 'Navigate due diligence, terms and closing.',
		items: [
			{ title: 'Data-room structure & checklist', desc: 'What goes in the data room, organised.', kind: 'Checklist' },
			{ title: 'Due-diligence checklist', desc: 'Anticipate what investors will ask for.', kind: 'Checklist' },
			{ title: 'Term-sheet explainer', desc: 'The clauses that matter and why.', kind: 'Guide' },
			{ title: 'Closing checklist', desc: 'From signed term sheet to funds in the bank.', kind: 'Checklist' },
			{ title: 'Example investment documents', desc: 'Reference copies of closing documents.', kind: 'Template' },
		],
	},
];
const ACTION: Record<Kind, string> = { Guide: 'Open', Template: 'View', Checklist: 'Open' };

export default function RaiseResourcesPage() {
	return (
		<Screen>
			<RaiseSectionHeader />

			<div style={{ display: 'grid', gap: 36 }}>
				{GROUPS.map((g) => (
					<section key={g.phase}>
						<div style={{ marginBottom: 14 }}>
							<div className="atlas-eyebrow" style={{ marginBottom: 6 }}>{g.phase}</div>
							<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.55 }}>{g.blurb}</div>
						</div>
						{/* Hairline-separated rows with navy hover — reuses the Raise home list styles. */}
						<div className="atlas-rowlist">
							{g.items.map((it) => (
								<div key={it.title} className="atlas-rowlist__row">
									<div className="atlas-rowlist__main">
										<div className="atlas-rowlist__title">{it.title}</div>
										<div className="atlas-rowlist__desc">{it.desc}</div>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
										<Badge>{it.kind}</Badge>
										<button className="atlas-btn atlas-btn--outline atlas-btn--sm" disabled title="Coming soon">{ACTION[it.kind]}</button>
									</div>
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		</Screen>
	);
}
