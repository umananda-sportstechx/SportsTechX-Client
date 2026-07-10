'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Copy, Check, Trash2, Webhook, Loader2, Lock, Send, RefreshCw, KeyRound, Pause, Play } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { formatDate } from '@/lib/utils';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

const WEBHOOK_EVENTS = [
	'company.created', 'company.updated',
	'deal.created', 'deal.updated',
	'investor.created', 'investor.updated',
	'export.completed',
] as const;

interface WebhookEndpoint {
	id: string; url: string; event_types: string[]; description: string | null;
	is_active: boolean; last_delivery_at: string | null; last_success_at: string | null;
	consecutive_failures: number; created_at: string;
}
interface Delivery {
	id: string; event_type: string; result: string; response_status: number | null;
	response_body_excerpt: string | null; retry_count: number; created_at: string;
}
interface SecretResponse { endpoint: WebhookEndpoint; signing_secret: string }

const resultVariant = (r: string): 'success' | 'destructive' | 'secondary' =>
	r === 'delivered' ? 'success' : r === 'failed' || r === 'dead' ? 'destructive' : 'secondary';

export default function WebhooksPage() {
	const router = useRouter();
	const { mutate } = useSWRConfig();
	const { data: profile, isLoading: profileLoading } = useUserProfile();
	const tier = getUserType(profile);
	const tierAllowed = tier === 'growth' || tier === 'pro';

	const [createOpen, setCreateOpen] = useState(false);
	const [url, setUrl] = useState('');
	const [desc, setDesc] = useState('');
	const [events, setEvents] = useState<string[]>([]);
	const [pending, setPending] = useState(false);
	const [secret, setSecret] = useState<string | null>(null); // reveal (create or rotate)
	const [copied, setCopied] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [deliveriesFor, setDeliveriesFor] = useState<string | null>(null);

	const { data: hooks, isLoading } = useSWR<WebhookEndpoint[]>(tierAllowed ? qk.webhooks.list() : null, { dedupingInterval: 30_000 });
	const refresh = () => void mutate(qk.webhooks.list());

	const toggleEvent = (e: string) => setEvents((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

	const create = async () => {
		if (!url.trim() || events.length === 0) { toast.error('Enter an https URL and pick at least one event.'); return; }
		setPending(true);
		try {
			const res = await apiRequest('POST', '/api/me/webhooks', { url: url.trim(), event_types: events, description: desc.trim() || null });
			const data = (await res.json()) as SecretResponse;
			setSecret(data.signing_secret);
			refresh();
		} catch (e) { toast.error((e as Error).message); } finally { setPending(false); }
	};

	const act = async (id: string, fn: () => Promise<unknown>, ok?: string) => {
		setBusyId(id);
		try { await fn(); if (ok) toast.success(ok); refresh(); }
		catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
	};

	const rotate = (id: string) => act(id, async () => {
		const res = await apiRequest('POST', `/api/me/webhooks/${id}/rotate-secret`);
		setSecret(((await res.json()) as SecretResponse).signing_secret);
	});
	const setActive = (h: WebhookEndpoint) => act(h.id, () => apiRequest('PATCH', `/api/me/webhooks/${h.id}`, { is_active: !h.is_active }), h.is_active ? 'Paused' : 'Resumed');
	const sendTest = (id: string) => act(id, () => apiRequest('POST', `/api/me/webhooks/${id}/test`), 'Test event queued');
	const remove = (id: string) => act(id, () => apiRequest('DELETE', `/api/me/webhooks/${id}`), 'Webhook deleted').then(() => setDeleteId(null));

	const closeCreate = () => { setCreateOpen(false); setSecret(null); setUrl(''); setDesc(''); setEvents([]); };
	const copySecret = async () => { if (!secret) return; await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); };

	if (!profileLoading && !tierAllowed) {
		return (
			<div className="flex flex-col items-center justify-center h-full py-32 text-center px-4">
				<Lock className="h-16 w-16 text-muted-foreground/30 mb-4" />
				<h2 className="text-xl font-semibold mb-2">Webhooks — Growth or Pro feature</h2>
				<p className="text-muted-foreground mb-6">Get signed event notifications pushed to your endpoint.</p>
				<Button onClick={() => router.push('/subscriptions')}>Upgrade plan</Button>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-8 max-w-5xl mx-auto">
			<PageHeader
				title="Webhooks"
				subtitle="Receive signed, real-time event notifications at your own endpoint"
				actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New webhook</Button>}
			/>

			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
					) : (hooks ?? []).length === 0 ? (
						<EmptyState icon={Webhook} title="No webhooks yet" description="Register an endpoint to start receiving events."
							action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New webhook</Button>} />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-xs">Endpoint</TableHead>
									<TableHead className="text-xs">Events</TableHead>
									<TableHead className="text-xs">Status</TableHead>
									<TableHead className="text-xs">Last delivery</TableHead>
									<TableHead className="text-xs text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(hooks ?? []).map((h) => (
									<TableRow key={h.id}>
										<TableCell className="font-mono text-xs max-w-[240px] truncate" title={h.url}>{h.url}</TableCell>
										<TableCell className="text-xs text-muted-foreground">{h.event_types.length} event{h.event_types.length === 1 ? '' : 's'}</TableCell>
										<TableCell>
											{h.is_active
												? <Badge variant={h.consecutive_failures > 0 ? 'secondary' : 'success'} className="text-xs">{h.consecutive_failures > 0 ? `${h.consecutive_failures} fails` : 'Active'}</Badge>
												: <Badge variant="secondary" className="text-xs">Paused</Badge>}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">{h.last_delivery_at ? formatDate(h.last_delivery_at) : 'Never'}</TableCell>
										<TableCell>
											<div className="flex gap-1 justify-end">
												<Button size="sm" variant="ghost" title="Send test" disabled={busyId === h.id} onClick={() => void sendTest(h.id)}><Send className="h-3.5 w-3.5" /></Button>
												<Button size="sm" variant="ghost" title="Deliveries" onClick={() => setDeliveriesFor(h.id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
												<Button size="sm" variant="ghost" title={h.is_active ? 'Pause' : 'Resume'} disabled={busyId === h.id} onClick={() => void setActive(h)}>{h.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</Button>
												<Button size="sm" variant="ghost" title="Rotate secret" disabled={busyId === h.id} onClick={() => void rotate(h.id)}><KeyRound className="h-3.5 w-3.5" /></Button>
												<Button size="sm" variant="ghost" title="Delete" onClick={() => setDeleteId(h.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Create / secret-reveal */}
			<Dialog open={createOpen || !!secret} onOpenChange={(o) => { if (!o) closeCreate(); }}>
				<DialogContent className="max-w-md">
					{secret ? (
						<>
							<DialogHeader>
								<DialogTitle>Save your signing secret</DialogTitle>
								<DialogDescription>This is the only time it&apos;s shown. Use it to verify the <code>webhook-signature</code> header on incoming deliveries.</DialogDescription>
							</DialogHeader>
							<div className="bg-muted rounded p-3 font-mono text-xs break-all border">{secret}</div>
							<DialogFooter className="gap-2">
								<Button onClick={copySecret} className="gap-2">{copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy secret</>}</Button>
								<Button variant="outline" onClick={closeCreate}>Done</Button>
							</DialogFooter>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>New webhook</DialogTitle>
								<DialogDescription>We POST a signed JSON payload to this https URL on each selected event.</DialogDescription>
							</DialogHeader>
							<div className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="wh-url">Endpoint URL</Label>
									<Input id="wh-url" placeholder="https://api.yourapp.com/webhooks/stx" value={url} onChange={(e) => setUrl(e.target.value)} />
								</div>
								<div className="space-y-1.5">
									<Label>Events</Label>
									<div className="grid grid-cols-2 gap-1.5">
										{WEBHOOK_EVENTS.map((e) => (
											<label key={e} className="flex items-center gap-2 text-xs cursor-pointer">
												<input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} />
												<code>{e}</code>
											</label>
										))}
									</div>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="wh-desc">Description (optional)</Label>
									<Input id="wh-desc" placeholder="e.g. Sync to our data warehouse" value={desc} onChange={(e) => setDesc(e.target.value)} />
								</div>
							</div>
							<DialogFooter className="gap-2">
								<Button variant="outline" onClick={closeCreate}>Cancel</Button>
								<Button onClick={() => void create()} disabled={pending || !url.trim() || events.length === 0}>
									{pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Deliveries */}
			<DeliveriesDialog endpointId={deliveriesFor} onClose={() => setDeliveriesFor(null)} />

			{/* Delete */}
			<Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete webhook?</DialogTitle>
						<DialogDescription>This stops all deliveries to this endpoint immediately.</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
						<Button variant="destructive" disabled={busyId === deleteId} onClick={() => deleteId && void remove(deleteId)}>Delete</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function DeliveriesDialog({ endpointId, onClose }: { endpointId: string | null; onClose: () => void }) {
	const { data, mutate, isLoading } = useSWR<Delivery[]>(endpointId ? qk.webhooks.deliveries(endpointId) : null, { dedupingInterval: 5_000 });
	const [busy, setBusy] = useState<string | null>(null);
	const retry = async (id: string) => {
		if (!endpointId) return;
		setBusy(id);
		try { await apiRequest('POST', `/api/me/webhooks/${endpointId}/deliveries/${id}/retry`); toast.success('Retry queued'); setTimeout(() => void mutate(), 1500); }
		catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
	};
	return (
		<Dialog open={!!endpointId} onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Recent deliveries</DialogTitle>
					<DialogDescription>The last 50 delivery attempts for this endpoint.</DialogDescription>
				</DialogHeader>
				{isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).length === 0 ? (
					<p className="text-sm text-muted-foreground py-6 text-center">No deliveries yet.</p>
				) : (
					<div className="max-h-[50vh] overflow-auto">
						<Table>
							<TableHeader><TableRow>
								<TableHead className="text-xs">Event</TableHead><TableHead className="text-xs">Result</TableHead>
								<TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">When</TableHead><TableHead className="text-xs" />
							</TableRow></TableHeader>
							<TableBody>
								{(data ?? []).map((d) => (
									<TableRow key={d.id}>
										<TableCell className="font-mono text-xs">{d.event_type}</TableCell>
										<TableCell><Badge variant={resultVariant(d.result)} className="text-xs capitalize">{d.result}</Badge></TableCell>
										<TableCell className="text-xs text-muted-foreground">{d.response_status ?? '—'}{d.retry_count > 0 ? ` · ${d.retry_count} retries` : ''}</TableCell>
										<TableCell className="text-xs text-muted-foreground">{formatDate(d.created_at)}</TableCell>
										<TableCell>
											{(d.result === 'failed' || d.result === 'dead') && (
												<Button size="sm" variant="ghost" disabled={busy === d.id} onClick={() => void retry(d.id)} title="Retry"><RefreshCw className="h-3.5 w-3.5" /></Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
				<DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
