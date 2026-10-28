'use client';

import { useEffect } from 'react';
import { mutate } from 'swr';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { qk } from '@/lib/query-keys';
import { refreshAccount, refreshPaths } from '@/lib/invalidate';

/**
 * The server's per-user stream (`GET /api/events`) → fresh screens.
 *
 * The server has long published `claim_verified`, `billing_subscription_changed`,
 * `verified_report_ready` and `notification` here, but nothing in the client
 * listened — so after an admin verified a claim, the verify badge, plan, trial
 * and credits stayed stale until a reload. Each event now refreshes the data it
 * changes. A raw fetch reader, because EventSource can't send the bearer token
 * (same approach as the admin's use-admin-realtime), with backoff on failure.
 * Missed events while disconnected are covered by refreshing on reconnect.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function onEvent(type: string): void {
	switch (type) {
		case 'claim_verified':
		case 'billing_subscription_changed':
			void refreshAccount(); // badge, tier/trial, feature gates, credits, subscription, notifications
			if (type === 'claim_verified') void refreshPaths('/api/raise', '/api/scout'); // workspaces linked on verify
			break;
		case 'verified_report_ready':
			void refreshPaths('/api/verified-reports', '/api/me/notifications');
			break;
		case 'notification':
			// Notifications also announce claim outcomes (e.g. rejected) — keep the
			// verify badge in step with the bell.
			void mutate(qk.me.notifications());
			void refreshPaths('/api/claims');
			break;
	}
}

export function useRealtime(enabled: boolean): void {
	useEffect(() => {
		if (!enabled) return;
		let stopped = false;
		let ctrl: AbortController | null = null;
		let backoff = 4_000;
		let connectedBefore = false;
		const bump = () => { backoff = Math.min(backoff * 2, 60_000); };

		const run = async (): Promise<void> => {
			while (!stopped) {
				try {
					const { data: { session } } = await getSupabaseBrowser().auth.getSession();
					const token = session?.access_token;
					if (!token) { await sleep(backoff); bump(); continue; }
					ctrl = new AbortController();
					const res = await fetch('/api/events', { headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal: ctrl.signal });
					if (!res.ok || !res.body) { await sleep(backoff); bump(); continue; }
					backoff = 4_000;
					// Back after a drop: anything published meanwhile was missed.
					if (connectedBefore) void refreshAccount();
					connectedBefore = true;
					const reader = res.body.getReader();
					const dec = new TextDecoder();
					let buf = '';
					while (!stopped) {
						const { value, done } = await reader.read();
						if (done) break;
						buf += dec.decode(value, { stream: true });
						const frames = buf.split('\n\n');
						buf = frames.pop() ?? '';
						for (const frame of frames) {
							let ev = 'message';
							for (const line of frame.split('\n')) if (line.startsWith('event:')) ev = line.slice(6).trim();
							if (ev !== 'heartbeat' && ev !== 'connected') onEvent(ev);
						}
					}
				} catch { /* network / abort — reconnect */ }
				if (!stopped) { await sleep(backoff); bump(); }
			}
		};
		void run();
		return () => { stopped = true; ctrl?.abort(); };
	}, [enabled]);
}
