import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROVIDER_DOCS } from '../providers';

export function generateStaticParams() {
	return Object.keys(PROVIDER_DOCS).map((provider) => ({ provider }));
}

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }) {
	const { provider } = await params;
	const doc = PROVIDER_DOCS[provider];
	if (!doc) return { title: 'Integration — SportsTechX' };
	return { title: `${doc.label} integration — SportsTechX`, description: doc.tagline };
}

function Monogram({ letter, brand, size = 52 }: { letter: string; brand: string; size?: number }) {
	return (
		<span
			aria-hidden
			className="inline-grid place-items-center rounded-2xl font-bold text-white shrink-0"
			style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(140deg, ${brand}, ${brand}cc)`, boxShadow: `0 8px 22px -10px ${brand}90` }}
		>
			{letter}
		</span>
	);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
	return <h2 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase mb-3">{children}</h2>;
}

export default async function IntegrationDocPage({ params }: { params: Promise<{ provider: string }> }) {
	const { provider } = await params;
	const doc = PROVIDER_DOCS[provider];
	if (!doc) notFound();

	return (
		<main className="max-w-3xl mx-auto px-5 pb-4">
			{/* Breadcrumb */}
			<nav className="pt-8 text-sm text-muted-foreground">
				<Link href="/docs/integrations" className="hover:text-foreground">Integrations</Link>
				<span className="mx-2 opacity-50">/</span>
				<span className="text-foreground">{doc.label}</span>
			</nav>

			{/* Header */}
			<header className="flex items-start gap-4 mt-6 mb-10">
				<Monogram letter={doc.letter} brand={doc.brand} />
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-3xl font-bold tracking-tight">{doc.label}</h1>
						<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">{doc.category}</span>
					</div>
					<p className="text-base text-muted-foreground leading-relaxed mt-1">{doc.tagline}</p>
					{doc.category === 'CRM sync' && (
						<Link href="/integrations" className="inline-flex items-center gap-1.5 mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
							Connect {doc.label} →
						</Link>
					)}
				</div>
			</header>

			<div className="space-y-10">
				{/* What syncs */}
				<section>
					<SectionHeading>What syncs</SectionHeading>
					<ul className="space-y-2">
						{doc.whatSyncs.map((li, i) => (
							<li key={i} className="flex gap-3 text-sm leading-relaxed">
								<span className="mt-2 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: doc.brand }} />
								<span className="text-muted-foreground">{li}</span>
							</li>
						))}
					</ul>
				</section>

				{/* Permissions */}
				<section>
					<SectionHeading>Permissions we request</SectionHeading>
					<div className="grid gap-2">
						{doc.permissions.map((p, i) => (
							<div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5">
								<div className="min-w-0 flex-1">
									<div className="font-medium text-sm">{p.scope}</div>
									<div className="text-sm text-muted-foreground leading-relaxed mt-0.5">{p.why}</div>
								</div>
								<span
									className="shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1"
									style={{ background: `${doc.brand}1a`, color: doc.brand }}
								>
									{p.access}
								</span>
							</div>
						))}
					</div>
				</section>

				{/* How to connect */}
				<section>
					<SectionHeading>How to connect</SectionHeading>
					<ol className="space-y-3">
						{doc.connectSteps.map((s, i) => (
							<li key={i} className="flex gap-3 text-sm leading-relaxed">
								<span className="grid place-items-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">{i + 1}</span>
								<span className="text-muted-foreground pt-0.5">{s}</span>
							</li>
						))}
					</ol>
				</section>

				{/* Credits */}
				{doc.credits && (
					<section>
						<SectionHeading>Sync &amp; credits</SectionHeading>
						<p className="text-sm text-muted-foreground leading-relaxed">{doc.credits}</p>
					</section>
				)}

				{/* Security callout */}
				<section className="rounded-xl border border-border bg-muted/40 p-5">
					<div className="font-semibold text-sm mb-1">Security &amp; data</div>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{doc.security}{' '}
						See our <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
					</p>
				</section>

				{/* External docs */}
				{doc.externalDocs && (
					<p className="text-sm text-muted-foreground">
						Provider reference:{' '}
						<a href={doc.externalDocs.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{doc.externalDocs.label} ↗</a>
					</p>
				)}
			</div>
		</main>
	);
}
