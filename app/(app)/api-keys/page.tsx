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
import { Plus, Copy, Check, Trash2, Key, Loader2, Lock } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { formatDate } from '@/lib/utils';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

interface ApiKey {
	id: string;
	name: string;
	description: string | null;
	api_key_prefix: string;
	scopes: string[];
	status: string;
	expires_at: string | null;
	last_used_at: string | null;
	rate_limit_per_minute: number;
	rate_limit_per_hour: number;
	rate_limit_per_day: number;
	created_at: string;
}

const ALL_SCOPES = ['companies:read', 'investors:read', 'deals:read'] as const;

interface CreateResponse {
	key: string;
	client: ApiKey;
}

export default function ApiKeysPage() {
	const router = useRouter();
	const { mutate } = useSWRConfig();
	const { data: profile, isLoading: profileLoading } = useUserProfile();
	const tier = getUserType(profile);
	const tierAllowed = tier === 'growth' || tier === 'pro';

	const [createOpen, setCreateOpen] = useState(false);
	const [newName, setNewName] = useState('');
	const [newMode, setNewMode] = useState<'live' | 'test'>('live');
	const [newScopes, setNewScopes] = useState<string[]>([...ALL_SCOPES]);
	const [revealedKey, setRevealedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [createPending, setCreatePending] = useState(false);
	const [revokePending, setRevokePending] = useState(false);

	const { data: keys, isLoading } = useSWR<ApiKey[]>(
		tierAllowed ? qk.apiKeys.list() : null,
		{ dedupingInterval: 60_000 },
	);

	const createKey = async (name: string) => {
		if (newScopes.length === 0) { toast.error('Select at least one scope.'); return; }
		setCreatePending(true);
		try {
			const res = await apiRequest('POST', '/api/me/api-keys', { name, mode: newMode, scopes: newScopes });
			const data = (await res.json()) as CreateResponse;
			setRevealedKey(data.key);
			setNewName('');
			void mutate(qk.apiKeys.list());
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setCreatePending(false);
		}
	};

	const toggleScope = (s: string) => setNewScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

	const revokeKey = async (id: string) => {
		setRevokePending(true);
		try {
			await apiRequest('DELETE', `/api/me/api-keys/${id}`);
			toast.success('API key revoked');
			setDeleteId(null);
			void mutate(qk.apiKeys.list());
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setRevokePending(false);
		}
	};

	const copyKey = async () => {
		if (!revealedKey) return;
		await navigator.clipboard.writeText(revealedKey);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const closeCreateModal = () => {
		setCreateOpen(false);
		setRevealedKey(null);
		setNewName('');
		setNewMode('live');
		setNewScopes([...ALL_SCOPES]);
	};

	// Tier gate
	if (!profileLoading && !tierAllowed) {
		return (
			<div className="flex flex-col items-center justify-center h-full py-32 text-center px-4">
				<Lock className="h-16 w-16 text-muted-foreground/30 mb-4" />
				<h2 className="text-xl font-semibold mb-2">API Keys — Growth or Pro feature</h2>
				<p className="text-muted-foreground mb-6">Create programmatic access tokens for the SportsTechX Developer API.</p>
				<Button onClick={() => router.push('/subscriptions')}>Upgrade plan</Button>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-8 max-w-5xl mx-auto">
			<PageHeader
				title="API Keys"
				subtitle="Programmatic access to the SportsTechX Developer API"
				actions={
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />New key
					</Button>
				}
			/>

			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="p-4 space-y-2">
							{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
						</div>
					) : (keys ?? []).length === 0 ? (
						<EmptyState
							icon={Key}
							title="No API keys yet"
							description="Create one to start calling the Developer API."
							action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New key</Button>}
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-xs">Name</TableHead>
									<TableHead className="text-xs">Prefix</TableHead>
									<TableHead className="text-xs">Scopes</TableHead>
									<TableHead className="text-xs">Status</TableHead>
									<TableHead className="text-xs">Last used</TableHead>
									<TableHead className="text-xs">Created</TableHead>
									<TableHead className="text-xs w-12"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(keys ?? []).map((k) => (
									<TableRow key={k.id}>
										<TableCell className="font-medium">
											{k.name}
											{k.api_key_prefix.startsWith('stx_test_') && <Badge variant="secondary" className="ml-2 text-[10px]">test</Badge>}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">{k.api_key_prefix}…</TableCell>
										<TableCell className="text-xs text-muted-foreground">{(k.scopes ?? []).map((s) => s.replace(':read', '')).join(', ') || '—'}</TableCell>
										<TableCell>
											<Badge variant={k.status === 'active' ? 'success' : 'secondary'} className="text-xs capitalize">
												{k.status}
											</Badge>
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{k.last_used_at ? formatDate(k.last_used_at) : 'Never'}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">{formatDate(k.created_at)}</TableCell>
										<TableCell>
											<Button size="sm" variant="ghost" onClick={() => setDeleteId(k.id)}>
												<Trash2 className="h-3.5 w-3.5 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Create modal */}
			<Dialog open={createOpen} onOpenChange={(o) => { if (!o) closeCreateModal(); }}>
				<DialogContent className="max-w-md">
					{revealedKey ? (
						<>
							<DialogHeader>
								<DialogTitle>Save your API key now</DialogTitle>
								<DialogDescription>
									This is the only time the full key will be displayed. Copy it and store it somewhere safe.
								</DialogDescription>
							</DialogHeader>
							<div className="bg-muted rounded p-3 font-mono text-xs break-all border">{revealedKey}</div>
							<DialogFooter className="gap-2">
								<Button onClick={copyKey} className="gap-2">
									{copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy key</>}
								</Button>
								<Button variant="outline" onClick={closeCreateModal}>Done</Button>
							</DialogFooter>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>Create new API key</DialogTitle>
								<DialogDescription>Give it a name so you can recognize it later.</DialogDescription>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="key-name">Name</Label>
								<Input id="key-name" placeholder="e.g. Production server" value={newName}
									onChange={(e) => setNewName(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Mode</Label>
								<div className="flex gap-2">
									{(['live', 'test'] as const).map((m) => (
										<Button key={m} type="button" size="sm" variant={newMode === m ? 'default' : 'outline'} className="capitalize flex-1" onClick={() => setNewMode(m)}>{m}</Button>
									))}
								</div>
								<p className="text-xs text-muted-foreground">Test keys are prefixed <code>stx_test_</code> and read the same data — use them in non-production.</p>
							</div>
							<div className="space-y-2">
								<Label>Scopes</Label>
								<div className="space-y-1.5">
									{ALL_SCOPES.map((s) => (
										<label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
											<input type="checkbox" checked={newScopes.includes(s)} onChange={() => toggleScope(s)} />
											<code className="text-xs">{s}</code>
										</label>
									))}
								</div>
							</div>
							<DialogFooter className="gap-2">
								<Button variant="outline" onClick={closeCreateModal}>Cancel</Button>
								<Button onClick={() => void createKey(newName.trim())}
									disabled={!newName.trim() || createPending}>
									{createPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
									Create
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Revoke confirmation */}
			<Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Revoke API key?</DialogTitle>
						<DialogDescription>
							This permanently disables the key. Any application using it will start getting 401s immediately.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
						<Button variant="destructive" disabled={revokePending}
							onClick={() => deleteId && void revokeKey(deleteId)}>
							{revokePending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Revoke
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
