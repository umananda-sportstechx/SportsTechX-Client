import type { LegalDoc } from './legal';

/**
 * A structured legal document in the Atlas landing page's voice.
 *
 * White ground, Kepler for the prose and Zuume for the headings — the same
 * pairing the testimonials and footer use. Styles live in landing.css under
 * `.lp-legal` so this file stays markup.
 *
 * `.lp` has no dark mode by design (see the landing.css header), so there are
 * no theme variants here.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
	return (
		<section className="lp-legal">
			<div className="lp-legal-inner">
				<header>
					<div className="lp-legal-eyebrow">Legal</div>
					<h1 className="lp-legal-title">{doc.title}</h1>
					{doc.subtitle && <p className="lp-legal-sub">{doc.subtitle}</p>}
					{doc.updated && <div className="lp-legal-updated">Last updated: {doc.updated}</div>}
				</header>

				<div className="lp-legal-body">
					{doc.sections.map((section, i) => (
						<section key={`${section.heading}-${i}`}>
							{section.level === 2
								? <h2>{section.heading}</h2>
								: <h3>{section.heading}</h3>}

							<div className="lp-legal-blocks">
								{section.blocks.map((block, j) =>
									block.kind === 'list' ? (
										<ul key={j}>
											{block.items.map((item, k) => (
												<li key={k}>
													{item.label && <strong>{item.label}{item.text ? ' ' : ''}</strong>}
													{item.text}
												</li>
											))}
										</ul>
									) : (
										<p key={j}>
											{block.label && <strong>{block.label}{block.text ? ' ' : ''}</strong>}
											{block.text}
										</p>
									)
								)}
							</div>
						</section>
					))}
				</div>
			</div>
		</section>
	);
}
