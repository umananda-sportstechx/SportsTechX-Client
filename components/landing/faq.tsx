'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

/* Atlas FAQ copy, from the "ATLAS LANDING PAGE FULL CONTENT" spec. Replaced the
   Playmakers placeholder questions + lorem answers. */
const FAQS: [string, string][] = [
	['What is Atlas?', 'Atlas brings together sports tech market intelligence, fundraising support and investment discovery through three products: Explore, Raise and Scout.'],
	['Which Atlas product is right for me?', 'Choose Explore to understand the market, Raise to prepare and manage a funding round, or Scout to source and assess investments.'],
	['What can I access with Explore?', 'Company and investor profiles, a structured market map, programs, events and initiatives, alongside SportsTechX reports and resources.'],
	['How does Raise analyse my pitch deck?', 'Upload your deck to identify strengths, gaps and potential investor concerns. Get prioritised improvements to sharpen your pitch.'],
	['Can I manage investor outreach in Atlas?', 'Yes. Raise organises investor targets, conversations, follow-ups and next steps in one pipeline, from initial contact through to closing.'],
	['Can I get feedback from SportsTechX?', 'Atlas Raise offers a strategy session to review your pitch, investor approach and next steps. Booking becomes available once the eligibility steps are complete.'],
	['How does Scout personalise recommendations?', 'Define your preferred stage, geography, sector, sport, cheque size and business model. Add exclusions to refine the companies Scout recommends.'],
	['What information supports due diligence?', 'Scout provides company traction, team information, funding history and round details, supported by market analysis and deal documents where authorised.'],
	['Can I search beyond my investment thesis?', 'Yes. Scout supports broad searches using filters or questions in plain language. Personalised recommendations follow your investment criteria.'],
	['Can I request introductions?', 'You can request introductions through relevant company and deal pages in Scout. Availability depends on the opportunity.'],
	['Can I save my research?', 'Explore lets you save areas of interest. Scout lets you build company watchlists and track opportunities through investment stages.'],
	['How much does Atlas cost?', 'Book a demo to discuss pricing for Explore, Raise or Scout and confirm the features you need.'],
];

export function Faq() {
	/* The design shows every row collapsed. */
	const [open, setOpen] = useState<number | null>(null);
	return (
		<section className="lp-cream lp-faq" id="faq">
			<div className="lp-inner">
				<h2>Frequently asked questions</h2>
				<div className="lp-faq-list">
					{FAQS.map(([q, a], i) => (
						<div className={`lp-faq-item ${open === i ? 'open' : ''}`} key={i}>
							<button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
								{q}
								<Plus className="lp-faq-icon" size={16} />
							</button>
							<div className="lp-faq-a"><div className="lp-faq-a-inner">{a}</div></div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
