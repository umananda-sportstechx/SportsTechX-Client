const MEMBERS = [
	{
		name: 'ROHN MALHOTRA',
		eyebrow: 'Network Intelligence',
		bio: 'Co-Founder & Managing Director at SportsTechX, the leading sports innovation intelligence platform, exited founder and Investment Director at Match Ventures.',
	},
	{
		name: 'THOMAS PREISS',
		eyebrow: 'Community & Operations',
		bio: 'Serial entrepreneur and community builder in sports, Co-Founder of Common Goal with deep expertise in building and operating high-impact membership networks.',
	},
];

export function Team() {
	return (
		<section className="lp-team" id="team">
			<div className="lp-team-glow" />
			<div className="lp-team-inner">
				<div className="lp-inner">
					<div className="lp-team-intro">
						<span className="lp-eyebrow lp-eyebrow--center" style={{ color: 'rgba(255,255,255,.6)' }}>Experts in Your Corner</span>
						<h2>Run your raise with experts in your corner</h2>
						<p>Quarterly strategic check-ins with SportsTechX leadership — to pressure-test your story, sharpen your investor approach and decide what happens next.</p>
					</div>
					<div className="lp-team-grid">
						{MEMBERS.map((m) => (
							<div className="lp-member" key={m.name}>
								<div className="lp-member-photo" />
								<div>
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
