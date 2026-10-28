import type { ReactNode } from 'react';

/**
 * Plain-language explanations for Raise Setup's jargon, shown in the (i) beside
 * each label — founders raising for the first time can't be assumed to know
 * what a data room or a SAFE is. One idea per tip, short enough to read in a
 * hover.
 */
export const SETUP_HELP = {
	round: (
		<ul>
			<li><strong>Pre-seed</strong> — first money, often from angels, to prove the idea.</li>
			<li><strong>Seed</strong> — to reach product–market fit.</li>
			<li><strong>Series A</strong> — to scale a model that works.</li>
			<li><strong>Series B+</strong> — later growth rounds.</li>
			<li><strong>Bridge</strong> — a short round to extend runway to the next one.</li>
		</ul>
	),
	committed: <p>Money investors have firmly agreed to put into this round — signed, or confirmed in writing — even if it hasn&apos;t arrived yet.</p>,
	closeDate: <p>When you aim to have the round signed and the money in the bank.</p>,
	lead: <p>The lead investor sets the terms, usually writes the biggest cheque and anchors the round, which makes it easier for others to join.</p>,
	structure: (
		<ul>
			<li><strong>Equity</strong> — investors buy shares at an agreed valuation.</li>
			<li><strong>SAFE</strong> — a simple agreement that turns into shares at your next priced round.</li>
			<li><strong>Convertible</strong> — a loan that turns into shares later, usually with interest and a discount.</li>
		</ul>
	),
	valuation: <p>What you believe the company is worth before this investment (the pre-money valuation). Leave it blank if you&apos;d rather let investors price the round.</p>,
	priorCapital: <p>The total raised in earlier rounds — equity, SAFEs, convertible notes and grants — not counting this raise.</p>,
	revenue: <p>Revenue over the last 12 months. If you sell subscriptions, use ARR: annual recurring revenue, i.e. this month&apos;s recurring revenue × 12.</p>,
	burn: <p>How much cash the company spends each month, after revenue coming in.</p>,
	runway: <p>How many months until the money runs out at today&apos;s burn: cash in the bank ÷ monthly burn.</p>,
	deck: <p>The short presentation (usually 10–15 slides) you send investors: problem, solution, market, traction, team, and how much you&apos;re raising.</p>,
	targetList: <p>A shortlist of investors that fit your stage, sector and cheque size — the ones you plan to approach. Atlas can help you build it.</p>,
	financialModel: <p>A spreadsheet projecting revenue, costs, hiring and cash for the next 3–5 years, with the assumptions behind them. Investors use it to test your plan and the amount you&apos;re asking for.</p>,
	dataRoom: <p>A shared, organised folder of the documents investors check in due diligence — company registration, cap table, key contracts, financial statements and IP.</p>,
	investorTypes: <p>Hover a type for what it means. Pick every kind you&apos;d take money from — Atlas ranks investors of these types higher in your recommendations.</p>,
	geographies: <p>Where the investors you want are based or invest. Atlas uses it to rank the investors it recommends.</p>,
	cheque: <p>How much a single investor would put into this round — the range you&apos;d accept from one investor. Investors tend to write a typical cheque size, so this shows which ones fit your round.</p>,
	leadPreference: (
		<ul>
			<li><strong>Lead</strong> — sets the terms and anchors the round.</li>
			<li><strong>Followers</strong> — join once a lead has committed.</li>
			<li><strong>Both</strong> — you&apos;re open to either.</li>
		</ul>
	),
	strategic: <p>Strategic investors are companies in your industry — clubs, leagues, brands, media. They can open doors to distribution and partnerships, but some may limit who else you can work with.</p>,
	expertise: <p>Beyond the money: the help you&apos;d most like from an investor — their network, know-how or doors they can open.</p>,
} satisfies Record<string, ReactNode>;

/** One line per investor type (the values match investor matching — don't rename them). */
export const INVESTOR_TYPE_HELP: Record<string, string> = {
	VC: 'Venture capital funds investing other people’s money in high-growth startups, in exchange for equity.',
	Angel: 'Individuals investing their own money, usually early and in smaller cheques — sometimes together as a syndicate.',
	'Family office': 'Firms that manage a wealthy family’s money — flexible and often more patient than funds.',
	Strategic: 'Companies in your industry (clubs, leagues, brands, media) investing for a strategic benefit as well as a return.',
	CVC: 'Corporate venture capital: a company’s own venture fund, e.g. a sportswear brand or broadcaster’s fund.',
	'Government fund': 'Public or state-backed funds supporting innovation — often with conditions such as where you’re based.',
};

/** Help founders actually look for in sports tech. "Commercial partnerships",
 *  "Sports rights" and "International expansion" are kept verbatim — they're
 *  already saved on raises. */
export const EXPERTISE_OPTIONS = [
	'Commercial partnerships', 'Intros to clubs, leagues & federations', 'Sports rights', 'Go-to-market & sales',
	'Media & distribution', 'Product & technology', 'International expansion', 'Follow-on fundraising', 'Hiring & talent', 'Other',
];
