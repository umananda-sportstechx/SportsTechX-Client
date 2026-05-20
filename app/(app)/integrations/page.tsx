'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check, ExternalLink, MessageSquare, Database, Building2, FileText } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { PageHeader } from '@/components/ui/page-header';

interface IntercomHashResponse {
	hash: string;
	user_id: string;
}

interface IntegrationCardData {
	name: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
	docsUrl: string;
	purpose: string;
	/** Whether it has a user-facing token / hash to display */
	hasUserToken?: boolean;
}

const INTEGRATIONS: IntegrationCardData[] = [
	{
		name: 'Intercom',
		icon: MessageSquare,
		description: 'Authenticated Messenger widget — uses an HMAC of your user ID for identity verification.',
		docsUrl: 'https://developers.intercom.com/installing-intercom/web/identity-verification/',
		purpose: 'In-app support chat',
		hasUserToken: true,
	},
	{
		name: 'Apollo',
		icon: Database,
		description: 'Investor + organization enrichment. Run by background workers; no user-facing config.',
		docsUrl: 'https://docs.apollo.io/reference/people-search',
		purpose: 'Investor data enrichment',
	},
	{
		name: 'Attio',
		icon: Building2,
		description: 'CRM sync — companies pushed to Attio when their data changes. Background-only.',
		docsUrl: 'https://developers.attio.com/',
		purpose: 'CRM sync',
	},
	{
		name: 'Notion',
		icon: FileText,
		description: 'Pulls structured data from a Notion database into the platform.',
		docsUrl: 'https://developers.notion.com/',
		purpose: 'Content ingestion',
	},
];

export default function IntegrationsPage() {
	const [copied, setCopied] = useState(false);

	const { data: intercom, isLoading: intercomLoading, error: intercomError } = useSWR<IntercomHashResponse>(
		qk.integrations.intercomHash(),
		{ dedupingInterval: 30 * 60_000, shouldRetryOnError: false },
	);

	const copyHash = async (hash: string) => {
		await navigator.clipboard.writeText(hash);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="p-4 md:p-8 max-w-5xl mx-auto">
			<PageHeader
				title="Integrations"
				subtitle="Status and configuration for external services connected to your account"
			/>

			<div className="grid gap-4 md:grid-cols-2">
				{INTEGRATIONS.map((integration) => {
					const Icon = integration.icon;
					return (
						<Card key={integration.name} className="flex flex-col">
							<CardHeader>
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-center gap-3">
										<div className="bg-muted rounded-lg p-2">
											<Icon className="h-5 w-5" />
										</div>
										<div>
											<CardTitle className="text-base">{integration.name}</CardTitle>
											<CardDescription className="text-xs">{integration.purpose}</CardDescription>
										</div>
									</div>
									<Badge variant="success" className="text-xs">Active</Badge>
								</div>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col">
								<p className="text-sm text-muted-foreground mb-4 flex-1">{integration.description}</p>
								{integration.hasUserToken && integration.name === 'Intercom' && (
									<div className="bg-muted/50 rounded p-3 mb-4 border">
										<p className="text-xs text-muted-foreground mb-1">Your Intercom user_hash:</p>
										{intercomLoading ? (
											<Skeleton className="h-4 w-full" />
										) : intercomError ? (
											<p className="text-xs text-muted-foreground italic">Sign in required.</p>
										) : intercom ? (
											<>
												<p className="font-mono text-xs break-all mb-2">{intercom.hash}</p>
												<Button
													size="sm"
													variant="outline"
													className="gap-2 h-7 text-xs"
													onClick={() => copyHash(intercom.hash)}
												>
													{copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy hash</>}
												</Button>
											</>
										) : null}
									</div>
								)}
								<Button variant="outline" size="sm" asChild className="w-full">
									<a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
										<ExternalLink className="h-3.5 w-3.5 mr-2" />Docs
									</a>
								</Button>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="text-base">Setting up Intercom</CardTitle>
					<CardDescription>
						If you embed the Intercom Messenger on your own site, use the user_hash above for Identity Verification.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`window.Intercom('boot', {
  app_id: 'YOUR_APP_ID',
  user_id: '${intercom?.user_id ?? '<your-user-id>'}',
  user_hash: '${intercom?.hash?.slice(0, 24) ?? '<see hash above>'}…',
});`}</code></pre>
				</CardContent>
			</Card>
		</div>
	);
}
