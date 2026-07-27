'use client';

import { Screen, H1, Sub, Card, Badge, Button } from '@/components/atlas/kit';

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
			{ title: 'Pipeline-management guidance', desc: 'Keep your pipeline current, without busywork.', kind: 'Guide' },
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
			<H1>Resources</H1>
			<Sub>Practical guidance, templates and checklists across the fundraising process.</Sub>

			<div style={{ display: 'grid', gap: 32, marginTop: 28 }}>
				{GROUPS.map((g) => (
					<div key={g.phase}>
						<div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
							<div style={{ fontSize: 16, fontWeight: 600 }}>{g.phase}</div>
							<span style={{ fontSize: 13, color: 'var(--a-faint)' }}>{g.blurb}</span>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
							{g.items.map((it) => (
								<Card key={it.title} style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
										<div style={{ fontWeight: 500, fontSize: 13 }}>{it.title}</div>
										<Badge>{it.kind}</Badge>
									</div>
									<div style={{ fontSize: 12, color: 'var(--a-faint)', lineHeight: 1.5, marginBottom: 14 }}>{it.desc}</div>
									<button className="atlas-btn atlas-btn--ghost atlas-btn--sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} disabled title="Coming soon">{ACTION[it.kind]}</button>
								</Card>
							))}
						</div>
					</div>
				))}
			</div>
		</Screen>
	);
}
