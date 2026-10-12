'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { cx, useDismiss } from '@/components/atlas';
import { ago } from '@/components/features/market/format';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * The in-app inbox, in the navbar.
 *
 * `me/notifications` (list · `:id/read` · `read-all`) and the `notifications`
 * table have been complete for a long time with no way to see them. Producers
 * were the other missing half — until now the only writer was CRM sync, which
 * is itself unreachable, so the feed could never be anything but empty.
 *
 * **Polled, not pushed.** The server does publish `user:<id>:events` over its
 * realtime bus, but nothing in the client subscribes to it, so a bell that
 * relied on it would silently never update. Two minutes plus SWR's
 * revalidate-on-focus is honest about what it is; this becomes a push the day
 * an SSE client exists.
 */
interface NotificationRow {
	id: string;
	kind: string;
	title: string;
	body: string | null;
	link: string | null;
	read_at: string | null;
	created_at: string;
}

interface Feed { data: NotificationRow[]; unread_count: number }

const POLL_MS = 120_000;

export function NotificationBell() {
	const { data, mutate } = useSWR<Feed>(
		qk.me.notifications(),
		{ refreshInterval: POLL_MS },
	);
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const router = useRouter();
	useDismiss(ref, open, () => setOpen(false));

	const rows = data?.data ?? [];
	const unread = data?.unread_count ?? 0;

	// Optimistic, because the list and the badge come from one response: marking
	// read has to move both or the badge lies until the next poll. The write is
	// fire-and-forget with a revalidate on failure — re-reading on success would
	// undo the very update that just landed.
	//
	// `apiRequest` resolves with the Response rather than throwing on a 4xx, so
	// the status has to be checked explicitly: a `.catch` alone would only see a
	// network error and a refused write would leave the badge showing a count
	// the server never cleared.
	const patch = (fn: (c: Feed) => Feed) => void mutate((cur) => (cur ? fn(cur) : cur), { revalidate: false });
	const write = (url: string) => {
		apiRequest('POST', url)
			.then((res) => { if (!res.ok) void mutate(); })
			.catch(() => void mutate());
	};

	const markRead = (id: string) => {
		const at = new Date().toISOString();
		patch((c) => ({
			...c,
			data: c.data.map((n) => (n.id === id ? { ...n, read_at: at } : n)),
			unread_count: Math.max(0, c.unread_count - 1),
		}));
		write(`/api/me/notifications/${id}/read`);
	};

	const markAll = () => {
		const at = new Date().toISOString();
		patch((c) => ({ ...c, data: c.data.map((n) => ({ ...n, read_at: n.read_at ?? at })), unread_count: 0 }));
		write('/api/me/notifications/read-all');
	};

	const openItem = (n: NotificationRow) => {
		if (!n.read_at) markRead(n.id);
		setOpen(false);
		if (n.link) router.push(n.link);
	};

	return (
		<div className="atlas-navbar__anchor" ref={ref}>
			<button
				type="button"
				className="atlas-bell"
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
				onClick={() => setOpen(!open)}
			>
				<Bell size={14} strokeWidth={1.75} aria-hidden="true" />
				{unread > 0 && <span className="atlas-bell__dot" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
			</button>

			{open && (
				<div className="atlas-menu atlas-menu--end atlas-notif" role="dialog" aria-label="Notifications">
					<div className="atlas-menu__head">
						<span>Notifications</span>
						{unread > 0 && (
							<button type="button" className="atlas-notif__all" onClick={markAll}>Mark all read</button>
						)}
					</div>
					{rows.length === 0 ? (
						<p className="atlas-notif__empty">Nothing yet. Claim outcomes, reports and deal reviews land here.</p>
					) : (
						<div className="atlas-menu__list atlas-menu__list--scroll">
							{rows.map((n) => (
								<button
									key={n.id}
									type="button"
									className={cx('atlas-notif__item', !n.read_at && 'is-unread')}
									onClick={() => openItem(n)}
								>
									<span className="atlas-notif__title">{n.title}</span>
									{n.body && <span className="atlas-notif__body">{n.body}</span>}
									<span className="atlas-notif__when">{ago(n.created_at)}</span>
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
