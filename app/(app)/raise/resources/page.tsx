'use client';

import { FileText, ClipboardCheck, LayoutTemplate } from 'lucide-react';
import { Page } from '@/components/ui/atoms';

/**
 * Atlas Raise — Resources (Notion "Resources"). Prepare → Connect → Close
 * framework, visible here without becoming the platform navigation. v1 is a
 * static catalogue; item actions link to real content as it's produced.
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
		],
	},
	{
		phase: 'Close', blurb: 'Navigate due diligence, terms and closing.',
		items: [
			{ title: 'Data-room structure & checklist', desc: 'What goes in the data room, organised.', kind: 'Checklist' },
			{ title: 'Due-diligence checklist', desc: 'Anticipate what investors will ask for.', kind: 'Checklist' },
			{ title: 'Term-sheet explainer', desc: 'The clauses that matter and why.', kind: 'Guide' },
			{ title: 'Closing checklist', desc: 'From signed term sheet to funds in the bank.', kind: 'Checklist' },
		],
	},
];
const ICON: Record<Kind, React.ReactNode> = { Guide: <FileText size={14} />, Template: <LayoutTemplate size={14} />, Checklist: <ClipboardCheck size={14} /> };

export default function RaiseResourcesPage() {
	return (
		<Page>
			<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Resources</h1>
			<p style={{ color: 'var(--fg-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>Practical guidance, templates and checklists across the fundraising process.</p>

			<div style={{ display: 'grid', gap: 'var(--space-5)' }}>
				{GROUPS.map((g) => (
					<div key={g.phase}>
						<div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
							<h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: 0 }}>{g.phase}</h2>
							<span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{g.blurb}</span>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
							{g.items.map((it) => (
								<div key={it.title} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
									<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>{ICON[it.kind]} {it.kind}</div>
									<div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{it.title}</div>
									<div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 12 }}>{it.desc}</div>
									<button className="btn ghost" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} disabled title="Coming soon">Open</button>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</Page>
	);
}
