'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check, ExternalLink, MessageSquare, Loader2, Plug, Settings2 } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { PageHeader } from '@/components/ui/page-header';
import { CrmSubscriptionsPanel } from '@/components/integrations/crm-subscription-wizard';

/**
 * CRM connections — the user-facing surface for connecting a CRM and syncing
 * exportable data to it. Each exported/synced row costs 1 export credit.
 *
 * Providers come from GET /api/integrations/crm with a `configured` flag: until a
 * provider's OAuth app credentials are supplied server-side, its card shows
 * "Coming soon" and the Connect button is disabled.
 */

interface CrmConnection {
	id: string;
	provider: string;
	status: 'connected' | 'disconnected' | 'error' | 'expired' | 'pending';
	workspace_name: string | null;
	sync_enabled: boolean;
	sync_frequency: 'off' | 'daily' | 'biweekly' | 'monthly';
	next_sync_at: string | null;
	mappings_configured: boolean;
	last_sync_at: string | null;
	last_sync_status: 'running' | 'success' | 'partial' | 'error' | null;
	last_sync_error: string | null;
	last_sync_row_count: number | null;
	created_at: string;
}

interface ProviderStatus {
	provider: string;
	label: string;
	description: string;
	configured: boolean;
	connection: CrmConnection | null;
}

interface IntercomHashResponse { hash: string; user_id: string }

export default function IntegrationsPage() {
	const params = useSearchParams();
	const { data: providers, isLoading, mutate } = useSWR<ProviderStatus[]>(qk.integrations.crm(), {
		dedupingInterval: 30_000,
	});

	// Surface the OAuth redirect outcome (?crm=connected_x | error_x) as a toast.
	useEffect(() => {
		const crm = params.get('crm');
		if (!crm) return;
		if (crm.startsWith('connected_')) toast.success(`Connected ${crm.replace('connected_', '')}.`);
		else if (crm.startsWith('error')) toast.error('Could not complete the connection. Please try again.');
		void mutate();
		// Clean the query string so the toast doesn't re-fire on refresh.
		window.history.replaceState(null, '', '/integrations');
	}, [params, mutate]);

	return (
		<div className="p-4 md:p-8 max-w-5xl mx-auto">
			<PageHeader
				title="CRM connections"
				subtitle="Connect a CRM to sync companies, deal flow, investors and more. Each synced row costs 1 export credit."
			/>
			<div className="-mt-2 mb-4">
				<Link href="/docs/integrations" target="_blank" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
					How integrations work & what data syncs <ExternalLink className="h-3 w-3" />
				</Link>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
				{providers?.map((p) => (
					<ProviderCard key={p.provider} p={p} onChanged={() => void mutate()} />
				))}
			</div>

			<div className="mt-8">
				<IntercomSection />
			</div>
		</div>
	);
}

function ProviderCard({ p, onChanged }: { p: ProviderStatus; onChanged: () => void }) {
	const [busy, setBusy] = useState(false);
	const [subsOpen, setSubsOpen] = useState(false);
	const conn = p.connection;
	const connected = conn?.status === 'connected';

	const connect = async () => {
		setBusy(true);
		try {
			const res = await apiRequest('POST', `/api/integrations/crm/${p.provider}/connect`);
			const { authorizeUrl } = (await res.json()) as { authorizeUrl: string };
			window.location.href = authorizeUrl;
		} catch (e) {
			toast.error((e as Error).message || 'Could not start the connection.');
			setBusy(false);
		}
	};

	const disconnect = async () => {
		if (!conn) return;
		setBusy(true);
		try {
			await apiRequest('DELETE', `/api/integrations/crm/${conn.id}`);
			toast.success(`Disconnected ${p.label}.`);
			onChanged();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Card className="flex flex-col">
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="bg-muted rounded-lg p-2"><Plug className="h-5 w-5" /></div>
						<div>
							<CardTitle className="text-base">{p.label}</CardTitle>
							<CardDescription className="text-xs">
								{connected ? (conn?.workspace_name ?? 'Connected') : p.configured ? 'Not connected' : 'Coming soon'}
							</CardDescription>
						</div>
					</div>
					{connected
						? <Badge variant="success" className="text-xs">Connected</Badge>
						: p.configured
							? <Badge variant="secondary" className="text-xs">Available</Badge>
							: <Badge variant="outline" className="text-xs">Soon</Badge>}
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col">
				<p className="text-sm text-muted-foreground mb-4 flex-1">{p.description}</p>

				{connected && conn ? (
					<div className="space-y-3">
						{/* Last run status. Scheduled connection sync was retired — recurring
						    sync now lives on exports (event-driven auto-sync). */}
						<p className="text-xs text-muted-foreground">
							Sync runs per <b>export</b> — each one sets what to sync, where it lands, and its own field mapping.
						</p>

						{/* Scoped, column-priced exports — the primary flow. */}
						<Button variant="secondary" size="sm" className="w-full h-8 text-xs" onClick={() => setSubsOpen(true)}>
							<Settings2 className="h-3.5 w-3.5 mr-1.5" /> Manage exports
						</Button>

						<button
							className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
							onClick={() => void disconnect()}
							disabled={busy}
						>
							Disconnect
						</button>

						{subsOpen && (
							<CrmSubscriptionsPanel
								connectionId={conn.id}
								provider={p.provider}
								onClose={() => { setSubsOpen(false); onChanged(); }}
							/>
						)}
					</div>
				) : (
					<Button
						size="sm"
						className="w-full"
						onClick={() => void connect()}
						disabled={!p.configured || busy}
						title={p.configured ? undefined : 'Coming soon'}
					>
						{busy ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
						{p.configured ? `Connect ${p.label}` : 'Coming soon'}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

/** Intercom identity-verification hash — for users who embed Intercom on their
 *  own site. Kept distinct from CRM connections (it's a developer helper). */
function IntercomSection() {
	const [copied, setCopied] = useState(false);
	const { data: intercom, isLoading, error } = useSWR<IntercomHashResponse>(
		qk.integrations.intercomHash(),
		{ dedupingInterval: 30 * 60_000, shouldRetryOnError: false },
	);

	const copyHash = async (hash: string) => {
		await navigator.clipboard.writeText(hash);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="bg-muted rounded-lg p-2"><MessageSquare className="h-5 w-5" /></div>
					<div>
						<CardTitle className="text-base">Intercom identity verification</CardTitle>
						<CardDescription className="text-xs">For embedding the Intercom Messenger on your own site</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="bg-muted/50 rounded p-3 border">
					<p className="text-xs text-muted-foreground mb-1">Your Intercom user_hash:</p>
					{isLoading ? (
						<Skeleton className="h-4 w-full" />
					) : error ? (
						<p className="text-xs text-muted-foreground italic">Sign in required.</p>
					) : intercom ? (
						<>
							<p className="font-mono text-xs break-all mb-2">{intercom.hash}</p>
							<Button size="sm" variant="outline" className="gap-2 h-7 text-xs" onClick={() => copyHash(intercom.hash)}>
								{copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy hash</>}
							</Button>
							<pre className="bg-muted rounded p-3 text-xs overflow-x-auto mt-3"><code>{`window.Intercom('boot', {
  app_id: 'YOUR_APP_ID',
  user_id: '${intercom.user_id}',
  user_hash: '${intercom.hash.slice(0, 24)}…',
});`}</code></pre>
							<a
								href="https://developers.intercom.com/installing-intercom/web/identity-verification/"
								target="_blank" rel="noopener noreferrer"
								className="inline-flex items-center text-xs text-muted-foreground hover:underline mt-3"
							>
								<ExternalLink className="h-3 w-3 mr-1" /> Intercom docs
							</a>
						</>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
