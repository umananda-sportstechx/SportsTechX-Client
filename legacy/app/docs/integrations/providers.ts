/**
 * Shared content + brand data for the public integration docs. Public so these
 * pages can double as the "documentation URL" providers (e.g. Attio) require
 * when an OAuth app is submitted for publication.
 */

export interface Permission { scope: string; access: 'Read & write' | 'Read'; why: string }

export interface ProviderDoc {
	slug: string;
	label: string;
	tagline: string;
	brand: string;        // brand accent (hex)
	letter: string;       // monogram letter
	category: 'CRM sync' | 'Support';
	whatSyncs: string[];
	permissions: Permission[];
	connectSteps: string[];
	credits?: string;
	security: string;
	externalDocs?: { label: string; url: string };
}

export const PROVIDER_DOCS: Record<string, ProviderDoc> = {
	attio: {
		slug: 'attio', label: 'Attio', letter: 'A', brand: '#266DF0', category: 'CRM sync',
		tagline: 'Push companies, investors and deal flow into your Attio workspace.',
		whatSyncs: [
			'Companies and investors you export become Company / Person records in Attio.',
			'Deal-flow rows (funding rounds, M&A) are written with the fields you map.',
			'You choose exactly which SportsTechX columns map to which Attio attributes before the first sync.',
		],
		permissions: [
			{ scope: 'Records', access: 'Read & write', why: 'Create and update the records you export.' },
			{ scope: 'Object configuration', access: 'Read', why: 'Read your objects and attributes to offer accurate field mapping. We never change your configuration.' },
		],
		connectSteps: [
			'Open Integrations in SportsTechX and click Connect Attio.',
			'Review the requested permissions in Attio and choose a workspace.',
			'Approve, then set your field mappings back in SportsTechX.',
			'Run a sync on demand, or set a schedule.',
		],
		credits: 'Sync on demand or on a schedule. Each synced row costs 1 export credit; only changed rows are written.',
		security: 'Your Attio access token is encrypted at rest (AES-256-GCM) and used only to write the records you export. Disconnect any time to revoke access.',
		externalDocs: { label: 'Attio OAuth documentation', url: 'https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth' },
	},
	hubspot: {
		slug: 'hubspot', label: 'HubSpot', letter: 'H', brand: '#ff7a59', category: 'CRM sync',
		tagline: 'Sync SportsTechX records to your HubSpot companies and contacts.',
		whatSyncs: [
			'Exported companies and investors become HubSpot Company records.',
			'Associated contacts become HubSpot Contact records.',
			'You map SportsTechX columns to HubSpot properties before the first sync.',
		],
		permissions: [
			{ scope: 'Companies', access: 'Read & write', why: 'crm.objects.companies.write — create and update companies.' },
			{ scope: 'Contacts', access: 'Read & write', why: 'crm.objects.contacts.write — create and update contacts.' },
		],
		connectSteps: [
			'Open Integrations and click Connect HubSpot.',
			'Approve the requested scopes in HubSpot and select the account.',
			'Set your field mappings, then sync on demand or on a schedule.',
		],
		credits: 'Each synced row costs 1 export credit. A refresh token keeps syncs working without re-authorising.',
		security: 'Tokens are encrypted at rest (AES-256-GCM). Disconnect any time to revoke access.',
		externalDocs: { label: 'HubSpot OAuth documentation', url: 'https://developers.hubspot.com/docs/api/oauth-quickstart-guide' },
	},
	salesforce: {
		slug: 'salesforce', label: 'Salesforce', letter: 'S', brand: '#00a1e0', category: 'CRM sync',
		tagline: 'Export accounts and leads into your Salesforce org.',
		whatSyncs: [
			'Exported companies become Salesforce Accounts.',
			'Associated people become Leads.',
			'Field mapping is configurable before the first sync.',
		],
		permissions: [
			{ scope: 'API access', access: 'Read & write', why: 'api — create and update records via the Salesforce REST API.' },
			{ scope: 'Offline access', access: 'Read', why: 'refresh_token — keep the connection alive without re-authorising.' },
		],
		connectSteps: [
			'Open Integrations and click Connect Salesforce.',
			'Log in and approve access in Salesforce.',
			'Map your fields, then sync on demand or on a schedule.',
		],
		credits: 'Each synced row costs 1 export credit.',
		security: 'Tokens are encrypted at rest (AES-256-GCM). Disconnect any time to revoke access.',
		externalDocs: { label: 'Salesforce OAuth documentation', url: 'https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm' },
	},
	'google-sheets': {
		slug: 'google-sheets', label: 'Google Sheets', letter: 'G', brand: '#0f9d58', category: 'CRM sync',
		tagline: 'Send exports straight to a Google Sheet you can share with your team.',
		whatSyncs: [
			'Exported rows are written to a Google Sheet in your Drive.',
			'Columns follow the export layout you choose in SportsTechX.',
		],
		permissions: [
			{ scope: 'Spreadsheets', access: 'Read & write', why: 'spreadsheets — create and update the sheet we write to.' },
			{ scope: 'Drive (app files only)', access: 'Read & write', why: 'drive.file — limited to files this app creates; we cannot see the rest of your Drive.' },
		],
		connectSteps: [
			'Open Integrations and click Connect Google Sheets.',
			'Approve the requested scopes in the Google consent screen.',
			'Choose your columns, then sync on demand or on a schedule.',
		],
		credits: 'Each synced row costs 1 export credit.',
		security: 'Tokens are encrypted at rest (AES-256-GCM). The drive.file scope means we only ever touch sheets this app creates. Disconnect any time.',
		externalDocs: { label: 'Google OAuth documentation', url: 'https://developers.google.com/identity/protocols/oauth2/web-server' },
	},
	intercom: {
		slug: 'intercom', label: 'Intercom', letter: 'I', brand: '#1f8ded', category: 'Support',
		tagline: 'The in-app support chat, secured with Intercom identity verification.',
		whatSyncs: [
			'When you are signed in, the Intercom Messenger loads with your identity so our team can help you in context.',
			'Only the details needed to support you — your name, email and account id — are shared with Intercom.',
		],
		permissions: [
			{ scope: 'Identity verification', access: 'Read', why: 'We sign your user id server-side (HMAC-SHA256) so nobody can impersonate you in chat.' },
		],
		connectSteps: [
			'No action needed — the Messenger appears automatically when you are signed in.',
		],
		security: 'The verification secret never leaves our servers, and the signature cannot be forged from the browser. See our Privacy Policy for the full list of processors.',
		externalDocs: { label: 'Intercom identity verification', url: 'https://developers.intercom.com/installing-intercom/web/identity-verification/' },
	},
};

// Providers kept in the catalogue (so their entries/detail content still exist)
// but hidden from the public docs index until they're actually live.
const HIDDEN_FROM_DOCS = new Set(['hubspot', 'salesforce']);

export const PROVIDER_LIST = Object.values(PROVIDER_DOCS).filter((p) => !HIDDEN_FROM_DOCS.has(p.slug));
