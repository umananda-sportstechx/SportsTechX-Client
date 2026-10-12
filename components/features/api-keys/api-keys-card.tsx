'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Field, Input, Loading } from '@/components/atlas';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * Personal API keys for the public read API.
 *
 * The backend for this has been complete for a long time and had no UI at all:
 * `me/api-keys` hashes with SHA-256, compares with `timingSafeEqual`, caches
 * resolution in Redis with pub-sub invalidation, applies per-tier rate limits,
 * enforces scopes and origin allow-lists, and guards six read endpoints under
 * `/api/v1`. The only missing piece was somewhere to press the button.
 *
 * Paid tiers only — the controller carries `@RequireTier(...PAID_TIERS)`, so an
 * Explore user never sees this card (the Account page renders the upgrade card
 * in its place).
 */

/** Mirrors `PUBLIC_COLS` in api-keys.controller.ts — never the hash. */
interface ApiKeyRow {
	id: string;
	name: string;
	description: string | null;
	api_key_prefix: string;
	scopes: string[] | null;
	status: string;
	expires_at: string | null;
	last_used_at: string | null;
	rate_limit_per_minute: number | null;
	rate_limit_per_day: number | null;
	created_at: string;
}

export function ApiKeysCard() {
	const { data, isLoading, mutate } = useSWR<ApiKeyRow[]>(qk.apiKeys.list());
	const confirm = useConfirm();
	const [name, setName] = useState('');
	const [creating, setCreating] = useState(false);
	// The full key, shown exactly once. The server never returns it again —
	// only the prefix — so losing this means creating another key.
	const [freshKey, setFreshKey] = useState<string | null>(null);

	const keys = (data ?? []).filter((k) => k.status !== 'revoked');

	const create = async () => {
		if (!name.trim()) { toast.error('Give the key a name'); return; }
		setCreating(true);
		try {
			const res = await apiRequest('POST', '/api/me/api-keys', { name: name.trim() });
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as { key: string };
			setFreshKey(body.key);
			setName('');
			await mutate();
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not create the key');
		} finally { setCreating(false); }
	};

	const revoke = async (k: ApiKeyRow) => {
		const ok = await confirm({
			title: `Revoke "${k.name}"?`,
			description: 'Any integration using this key stops working immediately. This cannot be undone — you would need to issue a new key.',
			confirmLabel: 'Revoke key',
			destructive: true,
		});
		if (!ok) return;
		try {
			const res = await apiRequest('DELETE', `/api/me/api-keys/${k.id}`);
			if (!res.ok && res.status !== 204) throw new Error(String(res.status));
			toast.success('Key revoked');
			await mutate();
		} catch (e) { toast.error((e as Error).message ?? 'Could not revoke the key'); }
	};

	const copy = async (value: string) => {
		try { await navigator.clipboard.writeText(value); toast.success('Copied'); }
		catch { toast.error('Could not copy — select the key and copy it manually.'); }
	};

	return (
		<Card>
			<div style={{ fontSize: 16, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)', marginBottom: 6 }}>API keys</div>
			<p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)', margin: '0 0 16px' }}>
				Read-only access to companies, investors and deals over the Atlas API. Rate limits are set by your plan.
			</p>

			{freshKey && (
				<div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 'var(--a-radius-sm)', background: 'var(--a-ok-bg)', border: '1px solid color-mix(in srgb, var(--a-ok) 30%, transparent)' }}>
					<div style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--a-ok)', marginBottom: 8 }}>
						Copy this now — it is not shown again
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<code style={{ flex: 1, minWidth: 0, fontFamily: 'var(--a-mono)', fontSize: 12, wordBreak: 'break-all', color: 'var(--a-ink)' }}>{freshKey}</code>
						<Button size="sm" variant="outline" onClick={() => void copy(freshKey)}><Copy size={13} /> Copy</Button>
					</div>
					<button
						type="button"
						onClick={() => setFreshKey(null)}
						style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--a-muted)' }}
					>
						I&apos;ve saved it
					</button>
				</div>
			)}

			{isLoading ? <Loading /> : keys.length === 0 ? (
				<p style={{ fontSize: 13, color: 'var(--a-muted)', margin: '0 0 16px' }}>No keys yet.</p>
			) : (
				<div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
					{keys.map((k) => (
						<div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 'var(--a-radius-sm)', background: 'var(--a-inset)' }}>
							<KeyRound size={15} style={{ color: 'var(--a-muted)', flexShrink: 0 }} aria-hidden="true" />
							<span style={{ flex: 1, minWidth: 0 }}>
								<span style={{ display: 'block', fontSize: 13, color: 'var(--a-ink)' }}>{k.name}</span>
								<span style={{ display: 'block', fontFamily: 'var(--a-mono)', fontSize: 11, color: 'var(--a-faint)', marginTop: 2 }}>
									{k.api_key_prefix}…
									{k.last_used_at
										? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}`
										: ' · never used'}
								</span>
							</span>
							{k.rate_limit_per_day != null && <Badge tone="neutral">{k.rate_limit_per_day.toLocaleString()}/day</Badge>}
							<Button size="sm" variant="danger" onClick={() => void revoke(k)}><Trash2 size={13} /> Revoke</Button>
						</div>
					))}
				</div>
			)}

			<div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
				<div style={{ flex: 1, minWidth: 200 }}>
					<Field label="New key name"><Input value={name} placeholder="e.g. Internal dashboard" onChange={(e) => setName(e.target.value)} /></Field>
				</div>
				<Button disabled={creating || !name.trim()} onClick={() => void create()}>
					<Plus size={13} /> {creating ? 'Creating…' : 'Create key'}
				</Button>
			</div>
		</Card>
	);
}
