'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@/lib/query-client';
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
	status: string;
	expires_at: string | null;
	last_used_at: string | null;
	rate_limit_per_minute: number;
	rate_limit_per_hour: number;
	rate_limit_per_day: number;
	created_at: string;
}

interface CreateResponse {
	key: string;
	client: ApiKey;
}

export default function ApiKeysPage() {
	const router = useRouter();
	const qc = useQueryClient();
	const { data: profile, isLoading: profileLoading } = useUserProfile();
	const tier = getUserType(profile);
	const tierAllowed = tier === 'plus' || tier === 'pro';

	const [createOpen, setCreateOpen] = useState(false);
	const [newName, setNewName] = useState('');
	const [revealedKey, setRevealedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const { data: keys, isLoading } = useQuery<ApiKey[]>({
		queryKey: qk.apiKeys.list(),
		staleTime: 60_000,
		enabled: tierAllowed,
	});

	const createMutation = useMutation({
		mutationFn: async (name: string) => {
			const res = await apiRequest('POST', '/api/me/api-keys', { name });
			return (await res.json()) as CreateResponse;
		},
		onSuccess: (data) => {
			setRevealedKey(data.key);
			setNewName('');
			qc.invalidateQueries({ queryKey: qk.apiKeys.list() });
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const revokeMutation = useMutation({
		mutationFn: async (id: string) => {
			await apiRequest('DELETE', `/api/me/api-keys/${id}`);
		},
		onSuccess: () => {
			toast.success('API key revoked');
			setDeleteId(null);
			qc.invalidateQueries({ queryKey: qk.apiKeys.list() });
		},
		onError: (err: Error) => toast.error(err.message),
	});

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
	};

	// Tier gate
	if (!profileLoading && !tierAllowed) {
		return (
			<div className="flex flex-col items-center justify-center h-full py-32 text-center px-4">
				<Lock className="h-16 w-16 text-muted-foreground/30 mb-4" />
				<h2 className="text-xl font-semibold mb-2">API Keys — Plus or Pro feature</h2>
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
									<TableHead className="text-xs">Status</TableHead>
									<TableHead className="text-xs">Last used</TableHead>
									<TableHead className="text-xs">Created</TableHead>
									<TableHead className="text-xs w-12"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(keys ?? []).map((k) => (
									<TableRow key={k.id}>
										<TableCell className="font-medium">{k.name}</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">{k.api_key_prefix}…</TableCell>
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
									onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName.trim()); }}
								/>
							</div>
							<DialogFooter className="gap-2">
								<Button variant="outline" onClick={closeCreateModal}>Cancel</Button>
								<Button onClick={() => createMutation.mutate(newName.trim())}
									disabled={!newName.trim() || createMutation.isPending}>
									{createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
						<Button variant="destructive" disabled={revokeMutation.isPending}
							onClick={() => deleteId && revokeMutation.mutate(deleteId)}>
							{revokeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Revoke
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
