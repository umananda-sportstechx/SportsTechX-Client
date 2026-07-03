import Link from 'next/link';

export const metadata = {
	title: 'Integrations — SportsTechX Docs',
	description: 'Connect your CRM and tools to SportsTechX: how it works, what data syncs, and security.',
};

const PROVIDERS = [
	{ slug: 'attio', label: 'Attio', blurb: 'Push companies, investors and deal flow into your Attio workspace.' },
	{ slug: 'hubspot', label: 'HubSpot', blurb: 'Sync records to HubSpot companies and contacts.' },
	{ slug: 'salesforce', label: 'Salesforce', blurb: 'Export accounts and leads into your Salesforce org.' },
	{ slug: 'google-sheets', label: 'Google Sheets', blurb: 'Send exports straight to a shared Google Sheet.' },
	{ slug: 'intercom', label: 'Intercom', blurb: 'In-app support chat with identity verification.' },
];

export default function IntegrationsDocsPage() {
	return (
		<main className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-3xl mx-auto">
				<header className="mb-8">
					<Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
					<h1 className="text-3xl font-bold mt-4 mb-2">Integrations</h1>
					<p className="text-base text-muted-foreground">
						Connect your CRM and tools so the data you find in SportsTechX flows into the systems your team
						already uses.
					</p>
				</header>

				<section className="mb-8">
					<h2 className="text-lg font-semibold mb-2">How connecting works</h2>
					<ol className="text-sm leading-relaxed text-muted-foreground space-y-1.5 list-decimal pl-5">
						<li>Open <Link href="/integrations" className="underline">Integrations</Link> and click Connect on a provider.</li>
						<li>You are redirected to the provider to review the permissions and approve access (OAuth 2.0).</li>
						<li>Back in SportsTechX, map your columns to the provider&apos;s fields.</li>
						<li>Sync on demand or on a schedule. Each synced row costs 1 export credit.</li>
					</ol>
				</section>

				<section className="mb-8 rounded-lg border border-border p-4">
					<h2 className="text-base font-semibold mb-1">Security</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						We use standard OAuth 2.0 — SportsTechX never sees your provider password. Access tokens are
						encrypted at rest (AES-256-GCM) and used only for the actions described in each provider&apos;s
						page. You can disconnect at any time, which revokes our access. See our{' '}
						<Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
					</p>
				</section>

				<section>
					<h2 className="text-lg font-semibold mb-3">Providers</h2>
					<div className="grid sm:grid-cols-2 gap-3">
						{PROVIDERS.map((p) => (
							<Link
								key={p.slug}
								href={`/docs/integrations/${p.slug}`}
								className="block rounded-lg border border-border p-4 hover:border-foreground/30 transition-colors"
							>
								<div className="font-medium mb-1">{p.label}</div>
								<div className="text-sm text-muted-foreground">{p.blurb}</div>
							</Link>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
