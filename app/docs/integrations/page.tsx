import Link from 'next/link';
import { PROVIDER_LIST } from './providers';

export const metadata = {
	title: 'Integrations — SportsTechX Docs',
	description: 'Connect your CRM and tools to SportsTechX: how it works, what data syncs, and security.',
};

const STEPS = [
	{ n: '1', t: 'Connect', d: 'Click Connect on a provider in the app.' },
	{ n: '2', t: 'Approve', d: 'Review and approve the permissions (OAuth 2.0).' },
	{ n: '3', t: 'Map', d: 'Map your columns to the provider’s fields.' },
	{ n: '4', t: 'Sync', d: 'Sync on demand or on a schedule.' },
];

function Monogram({ letter, brand, size = 44 }: { letter: string; brand: string; size?: number }) {
	return (
		<span
			aria-hidden
			className="inline-grid place-items-center rounded-xl font-bold text-white shrink-0"
			style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(140deg, ${brand}, ${brand}cc)`, boxShadow: `0 6px 18px -8px ${brand}80` }}
		>
			{letter}
		</span>
	);
}

export default function IntegrationsDocsPage() {
	return (
		<main className="max-w-4xl mx-auto px-5">
			{/* Hero */}
			<section className="pt-16 pb-10">
				<div className="text-xs font-semibold tracking-[0.14em] text-primary uppercase mb-3">Integrations</div>
				<h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05] mb-4">Connect your stack</h1>
				<p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
					Send the companies, deal flow and investors you find in SportsTechX straight into the CRM and tools
					your team already uses — securely, over standard OAuth.
				</p>
			</section>

			{/* How it works */}
			<section className="pb-10">
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{STEPS.map((s) => (
						<div key={s.n} className="rounded-xl border border-border bg-card p-4">
							<div className="w-7 h-7 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold mb-3">{s.n}</div>
							<div className="font-semibold mb-1">{s.t}</div>
							<div className="text-sm text-muted-foreground leading-relaxed">{s.d}</div>
						</div>
					))}
				</div>
				<p className="text-sm text-muted-foreground mt-3">Each synced row costs 1 export credit. Only rows that changed since the last sync are written.</p>
			</section>

			{/* Providers */}
			<section className="pb-6">
				<h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-4">Providers</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					{PROVIDER_LIST.map((p) => (
						<Link
							key={p.slug}
							href={`/docs/integrations/${p.slug}`}
							className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-foreground/25 hover:shadow-sm transition-all"
						>
							<Monogram letter={p.letter} brand={p.brand} />
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-semibold">{p.label}</span>
									<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">{p.category}</span>
								</div>
								<div className="text-sm text-muted-foreground leading-relaxed mt-1">{p.tagline}</div>
								<div className="text-sm text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Read the guide →</div>
							</div>
						</Link>
					))}
				</div>
			</section>

			{/* Security */}
			<section className="pb-4">
				<div className="rounded-xl border border-border bg-muted/40 p-5">
					<div className="font-semibold mb-1">Built on OAuth 2.0</div>
					<p className="text-sm text-muted-foreground leading-relaxed">
						SportsTechX never sees your provider password. Access tokens are encrypted at rest (AES-256-GCM)
						and used only for the actions described on each provider’s page. Disconnect any time to revoke
						access. See our <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
					</p>
				</div>
			</section>
		</main>
	);
}
