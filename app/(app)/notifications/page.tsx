'use client';

import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Page, Empty } from '@/components/ui/atoms';

interface NotificationRow {
	id: string;
	kind: string;
	title: string;
	body: string | null;
	link: string | null;
	read_at: string | null;
	created_at: string;
}

interface InboxResponse {
	data: NotificationRow[];
	unread_count: number;
	nextCursor: string | null;
}

export default function NotificationsPage() {
	const { mutate } = useSWRConfig();
	const { data, isLoading } = useSWR<InboxResponse>(qk.me.notifications(), {
		dedupingInterval: 60_000,
		refreshInterval: 5 * 60_000,
	});
	const rows = data?.data ?? [];
	const unread = data?.unread_count ?? 0;

	const markRead = async (id: string) => {
		void mutate(
			qk.me.notifications(),
			(prev: InboxResponse | undefined) => prev
				? {
					...prev,
					data: prev.data.map((n) => n.id === id && !n.read_at
						? { ...n, read_at: new Date().toISOString() } : n),
					unread_count: Math.max(0, prev.unread_count - 1),
				}
				: prev,
			{ revalidate: false },
		);
		try {
			await apiRequest('POST', `/api/me/notifications/${id}/read`);
		} catch {
			void mutate(qk.me.notifications());
		}
	};

	const markAllRead = async () => {
		if (unread === 0) return;
		void mutate(
			qk.me.notifications(),
			(prev: InboxResponse | undefined) => prev
				? {
					...prev,
					data: prev.data.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }),
					unread_count: 0,
				}
				: prev,
			{ revalidate: false },
		);
		try {
			await apiRequest('POST', '/api/me/notifications/read-all');
			toast.success('All marked read');
		} catch {
			void mutate(qk.me.notifications());
		}
	};

	return (
		<Page>
			<div style={{
				display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
				marginBottom: 'var(--space-5)', gap: 16, flexWrap: 'wrap',
			}}>
				<div>
					<div style={{
						fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)',
						textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
					}}>
						Inbox · {unread} unread
					</div>
					<h1 style={{
						fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800,
						letterSpacing: '-0.02em', lineHeight: 1, margin: 0,
					}}>
						Notifications
					</h1>
				</div>
				{unread > 0 && (
					<button className="btn ghost" onClick={() => void markAllRead()}>
						<CheckCheck size={14} /> Mark all read
					</button>
				)}
			</div>

			{isLoading && rows.length === 0 ? (
				<Empty msg="Loading…" />
			) : rows.length === 0 ? (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
					<Bell size={36} color="var(--fg-muted)" />
					<div style={{ color: 'var(--fg-muted)' }}>No notifications yet.</div>
				</div>
			) : (
				<div className="card" style={{ padding: 0 }}>
					{rows.map((n, i) => {
						const isUnread = n.read_at === null;
						const body = (
							<div
								style={{
									display: 'flex',
									gap: 12,
									padding: 'var(--space-3) var(--space-4)',
									borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
									alignItems: 'flex-start',
									background: isUnread ? 'var(--bg-2)' : 'transparent',
								}}
							>
								<div style={{
									width: 6, height: 6, marginTop: 8, flexShrink: 0, borderRadius: '50%',
									background: isUnread ? 'var(--accent)' : 'transparent',
								}} />
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontWeight: isUnread ? 700 : 500, fontSize: 14, marginBottom: 2 }}>
										{n.title}
									</div>
									{n.body && (
										<div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 4, lineHeight: 1.5 }}>
											{n.body}
										</div>
									)}
									<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
										{formatRelative(n.created_at)}
									</div>
								</div>
								{isUnread && (
									<button
										onClick={(e) => { e.preventDefault(); void markRead(n.id); }}
										className="btn ghost"
										style={{ flexShrink: 0 }}
										title="Mark as read"
									>
										<Check size={12} />
									</button>
								)}
							</div>
						);
						return n.link ? (
							<Link
								key={n.id}
								href={n.link}
								onClick={() => isUnread && void markRead(n.id)}
								style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
							>
								{body}
							</Link>
						) : (
							<div key={n.id}>{body}</div>
						);
					})}
				</div>
			)}
		</Page>
	);
}

function formatRelative(iso: string): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	const now = Date.now();
	const diff = Math.max(0, now - d.getTime());
	const min = Math.floor(diff / 60_000);
	if (min < 1) return 'just now';
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	if (day < 30) return `${day}d ago`;
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
