import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Public, no-auth documentation for each integration. Public so it can double as
 * the "documentation URL" that providers (e.g. Attio) require when an OAuth app
 * is submitted for publication, and as in-app help linked from /integrations.
 */

interface DocSection { h: string; p?: string; ul?: string[] }
interface ProviderDoc {
	label: string;
	tagline: string;
	sections: DocSection[];
	externalDocs?: { label: string; url: string };
}

const REDIRECT_URI = 'https://api.sportstechx.com/api/integrations/crm/callback';

const PROVIDERS: Record<string, ProviderDoc> = {
	attio: {
		label: 'Attio',
		tagline: 'Push companies, investors and deal flow from SportsTechX into your Attio workspace.',
		sections: [
			{ h: 'What syncs', ul: [
				'Companies and investors you export become Company / Person records in Attio.',
				'Deal-flow rows (funding rounds, M&A) are written with the fields you map.',
				'You choose exactly which SportsTechX columns map to which Attio attributes before the first sync.',
			] },
			{ h: 'Permissions we request', ul: [
				'Records — read & write: so we can create and update the records you export.',
				'Object configuration — read: so we can read your objects and attributes to offer accurate field mapping. We never change your workspace configuration.',
			] },
			{ h: 'How to connect', ul: [
				'Open Integrations in SportsTechX and click Connect Attio.',
				'You are redirected to Attio to review the requested permissions and choose a workspace.',
				'After you approve, you are returned to SportsTechX and can set your field mappings.',
				'Run a sync on demand, or set a schedule.',
			] },
			{ h: 'Sync & credits', p: 'You can sync on demand or on a schedule. Each synced row costs 1 export credit. Only rows that changed since the last sync are written.' },
			{ h: 'Security', p: 'Your Attio access token is encrypted at rest (AES-256-GCM) and used only to write the records you export. You can disconnect at any time from Integrations, which revokes our access.' },
		],
		externalDocs: { label: 'Attio OAuth documentation', url: 'https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth' },
	},
	hubspot: {
		label: 'HubSpot',
		tagline: 'Sync SportsTechX records to your HubSpot companies and contacts.',
		sections: [
			{ h: 'What syncs', ul: [
				'Exported companies and investors become HubSpot Company records.',
				'Associated contacts become HubSpot Contact records.',
				'You map SportsTechX columns to HubSpot properties before the first sync.',
			] },
			{ h: 'Permissions we request', ul: [
				'crm.objects.companies.write — create and update companies.',
				'crm.objects.contacts.write — create and update contacts.',
			] },
			{ h: 'How to connect', ul: [
				'Open Integrations and click Connect HubSpot.',
				'Approve the requested scopes in HubSpot and select the account to connect.',
				'Set your field mappings, then sync on demand or on a schedule.',
			] },
			{ h: 'Sync & credits', p: 'Each synced row costs 1 export credit. We store a refresh token so syncs keep working without you re-authorising.' },
			{ h: 'Security', p: 'Tokens are encrypted at rest (AES-256-GCM). Disconnect anytime from Integrations to revoke access.' },
		],
		externalDocs: { label: 'HubSpot OAuth documentation', url: 'https://developers.hubspot.com/docs/api/oauth-quickstart-guide' },
	},
	salesforce: {
		label: 'Salesforce',
		tagline: 'Export accounts and leads into your Salesforce org.',
		sections: [
			{ h: 'What syncs', ul: [
				'Exported companies become Salesforce Accounts.',
				'Associated people become Leads.',
				'Field mapping is configurable before the first sync.',
			] },
			{ h: 'Permissions we request', ul: [
				'api — access the Salesforce REST API to create/update records.',
				'refresh_token — keep the connection alive without re-authorising.',
			] },
			{ h: 'How to connect', ul: [
				'Open Integrations and click Connect Salesforce.',
				'Log in and approve access in Salesforce.',
				'Map your fields, then sync on demand or on a schedule.',
			] },
			{ h: 'Sync & credits', p: 'Each synced row costs 1 export credit.' },
			{ h: 'Security', p: 'Tokens are encrypted at rest (AES-256-GCM). Disconnect anytime to revoke access.' },
		],
		externalDocs: { label: 'Salesforce OAuth documentation', url: 'https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm' },
	},
	'google-sheets': {
		label: 'Google Sheets',
		tagline: 'Send exports straight to a Google Sheet you can share with your team.',
		sections: [
			{ h: 'What syncs', ul: [
				'Exported rows are written to a Google Sheet in your Drive.',
				'Columns follow the export layout you choose in SportsTechX.',
			] },
			{ h: 'Permissions we request', ul: [
				'spreadsheets — create and update the sheet we write to.',
				'drive.file — limited to files this app creates; we cannot see the rest of your Drive.',
			] },
			{ h: 'How to connect', ul: [
				'Open Integrations and click Connect Google Sheets.',
				'Approve the requested scopes in the Google consent screen.',
				'Choose your columns, then sync on demand or on a schedule.',
			] },
			{ h: 'Sync & credits', p: 'Each synced row costs 1 export credit.' },
			{ h: 'Security', p: 'Tokens are encrypted at rest (AES-256-GCM). The drive.file scope means we only ever touch sheets this app creates. Disconnect anytime.' },
		],
		externalDocs: { label: 'Google OAuth documentation', url: 'https://developers.google.com/identity/protocols/oauth2/web-server' },
	},
	intercom: {
		label: 'Intercom',
		tagline: 'The in-app support chat, secured with Intercom identity verification.',
		sections: [
			{ h: 'What it is', p: 'SportsTechX uses the Intercom Messenger for in-app support. When you are signed in, the widget is loaded with your identity so our team can help you in context.' },
			{ h: 'Identity verification', p: 'To make sure nobody can impersonate you in chat, we sign your user id server-side with an HMAC (SHA-256) and pass that hash to the Messenger. The secret never leaves our servers, and the hash cannot be forged from the browser.' },
			{ h: 'Your data', p: 'Only the details needed to support you (your name, email and account id) are shared with Intercom. See our Privacy Policy for the full list of processors.' },
		],
		externalDocs: { label: 'Intercom identity verification', url: 'https://developers.intercom.com/installing-intercom/web/identity-verification/' },
	},
};

export function generateStaticParams() {
	return Object.keys(PROVIDERS).map((provider) => ({ provider }));
}

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }) {
	const { provider } = await params;
	const doc = PROVIDERS[provider];
	if (!doc) return { title: 'Integration — SportsTechX' };
	return {
		title: `${doc.label} integration — SportsTechX`,
		description: doc.tagline,
	};
}

export default async function IntegrationDocPage({ params }: { params: Promise<{ provider: string }> }) {
	const { provider } = await params;
	const doc = PROVIDERS[provider];
	if (!doc) notFound();
	return (
		<main className="min-h-screen bg-background py-12 px-4">
			<article className="max-w-3xl mx-auto">
				<header className="mb-8">
					<Link href="/docs/integrations" className="text-sm text-muted-foreground hover:text-foreground">← All integrations</Link>
					<h1 className="text-3xl font-bold mt-4 mb-2">{doc.label}</h1>
					<p className="text-base text-muted-foreground">{doc.tagline}</p>
				</header>

				{doc.sections.map((s) => (
					<section key={s.h} className="mb-7">
						<h2 className="text-lg font-semibold mb-2">{s.h}</h2>
						{s.p && <p className="text-sm leading-relaxed text-muted-foreground">{s.p}</p>}
						{s.ul && (
							<ul className="text-sm leading-relaxed text-muted-foreground space-y-1.5 list-disc pl-5">
								{s.ul.map((li, i) => <li key={i}>{li}</li>)}
							</ul>
						)}
					</section>
				))}

				<section className="mb-7 rounded-lg border border-border p-4 text-sm text-muted-foreground">
					<div className="font-medium text-foreground mb-1">Data processing & security</div>
					OAuth access tokens are stored encrypted at rest (AES-256-GCM) and used only for the actions
					described above. You can disconnect at any time from the{' '}
					<Link href="/integrations" className="underline">Integrations</Link> page, which revokes our access.
					See our <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
				</section>

				{doc.externalDocs && (
					<p className="text-sm text-muted-foreground">
						Provider reference:{' '}
						<a href={doc.externalDocs.url} target="_blank" rel="noopener noreferrer" className="underline">{doc.externalDocs.label} ↗</a>
					</p>
				)}
			</article>
		</main>
	);
}
