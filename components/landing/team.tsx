import type { SiteItem } from '@/lib/site-content';

interface Member {
	name: string;
	eyebrow: string;
	bio: string;
	img: string;
	tone: string;
}

/* Shown until an admin fills Site assets → Atlas → Team / experts. */
const PLACEHOLDER_MEMBERS: Member[] = [
	{
		name: 'ROHN MALHOTRA',
		eyebrow: 'Network Intelligence',
		bio: 'Co-Founder & Managing Director at SportsTechX, the leading sports innovation intelligence platform, exited founder and Investment Director at Match Ventures.',
		img: '/landing/team-1.jpg',
		tone: 'linear-gradient(160deg,#b6ae9e,#4a4750)',
	},
	{
		name: 'THOMAS PREISS',
		eyebrow: 'Community & Operations',
		bio: 'Serial entrepreneur and community builder in sports, Co-Founder of Common Goal with deep expertise in building and operating high-impact membership networks.',
		img: '/landing/team-2.jpg',
		tone: 'linear-gradient(160deg,#a9adb4,#43454d)',
	},
];

const TONES = PLACEHOLDER_MEMBERS.map((m) => m.tone);

/**
 * Experts / team — dark section, light member cards. The photo bleeds to the
 * card's left edge at full height; the text column carries a mono role eyebrow
 * with a trailing rule, a Zuume name and a serif bio.
 *
 * Photos keep the `url(...) , <gradient>` paint so a missing or slow image
 * shows the tone rather than a broken-image icon.
 */
export function Team({ items }: { items?: SiteItem[] }) {
	const members: Member[] = items?.length
		? items.map((it, i) => ({
			name: it.title ?? '',
			eyebrow: it.subtitle ?? '',
			bio: it.body ?? '',
			img: it.url ?? '',
			tone: TONES[i % TONES.length],
		}))
		: PLACEHOLDER_MEMBERS;

	return (
		<section className="lp-team" id="team">
			<div className="lp-team-glow" />
			<div className="lp-team-inner">
				<div className="lp-inner">
					<div className="lp-rule-label lp-rule-label--dark"><i /><span>Experts in Your Corner</span><i /></div>
					<div className="lp-team-intro">
						<h2 className="lp-display">Run your raise with experts in your corner</h2>
						<p>Quarterly strategic check-ins with SportsTechX leadership — to pressure-test your story, sharpen your investor approach and decide what happens next.</p>
					</div>
					<div className="lp-team-grid">
						{members.map((m, i) => (
							<div className="lp-member" key={`${m.name}-${i}`}>
								<div className="lp-member-photo" style={{ background: m.img ? `url('${m.img}') center 22%/cover no-repeat, ${m.tone}` : m.tone }} />
								<div className="lp-member-text">
									<div className="lp-member-eyebrow">{m.eyebrow}</div>
									<div className="lp-member-name">{m.name}</div>
									<div className="lp-member-bio">{m.bio}</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
