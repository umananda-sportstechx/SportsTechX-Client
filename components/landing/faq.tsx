'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

const QUESTIONS = [
	"What's included in Playmakers membership?",
	'How much does it cost?',
	'What are the requirements to join?',
	'How much time commitment does Playmakers take?',
	'Who else is in the network?',
	"What's the acceptance rate?",
	'How long is the membership?',
	'Is Playmakers a digital network or do you meet in person?',
	'Who will be in my core group?',
	"What if I don't connect well with my core group?",
	'How do the curated introductions work? Can you help me connect with investors or potential clients?',
	'How is Playmakers different from other founder communities like Hampton, YPO, Vistage or EO?',
];

const ANSWER = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.';

export function Faq() {
	/* The design shows every row collapsed. */
	const [open, setOpen] = useState<number | null>(null);
	return (
		<section className="lp-cream lp-faq" id="faq">
			<div className="lp-inner">
				<h2>Frequently Asked Questions</h2>
				<div className="lp-faq-list">
					{QUESTIONS.map((q, i) => (
						<div className={`lp-faq-item ${open === i ? 'open' : ''}`} key={i}>
							<button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
								{q}
								<Plus className="lp-faq-icon" size={16} />
							</button>
							<div className="lp-faq-a"><div className="lp-faq-a-inner">{ANSWER}</div></div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
