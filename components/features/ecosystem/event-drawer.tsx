'use client';

import useSWR from 'swr';
import { ArrowUpRight, Tag as TagIcon } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Drawer, DrawerHead, DrawerBody, DrawerFoot } from '@/components/ui/drawer';
import { KV, Tag } from '@/components/ui/atoms';
import { Logo, Flag } from '@/components/atlas';
import '@/app/company-detail.css';

/** What the events list already knows about a row — shown at once, before the fetch lands. */
export interface EventRow {
	id: string; name: string; website: string | null; description: string | null;
	hq_country: string | null; hq_city: string | null;
	start_date?: string | null; end_date?: string | null; mode?: string | null;
}
type EventEntity = EventRow;
interface EventDetails { mode: string | null; start_date: string | null; end_date: string | null; cover_url: string | null; discount_code: string | null; discount_description: string | null }

const MODE_LABEL: Record<string, string> = { in_person: 'In person', virtual: 'Virtual', hybrid: 'Hybrid' };
const extUrl = (u: string | null | undefined) => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : undefined);
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Event details in the right-side drawer (the old Intelligence Hub showed the
 * same in a side panel):  dates, format, location, sports, the member discount
 * and the event website. Opened from the events table, cards or calendar;
 * `?event=<id>` in the URL makes it shareable.
 */
export function EventDrawer({ id, row, onClose }: { id: string | null; row?: EventRow; onClose: () => void }) {
	const entity = useSWR<EventEntity>(id ? qk.ecosystem.detail(id) : null);
	const details = useSWR<EventDetails | null>(id ? [`/api/ecosystem-entities/${id}/event-details`] : null);
	const sports = useSWR<{ id: string; name: string }[]>(id ? [`/api/ecosystem-entities/${id}/sports`] : null);

	const e = { ...(entity.data ?? {}), ...(row ?? {}) } as EventEntity;
	const d = details.data;
	const start = d?.start_date ?? e.start_date ?? null;
	const end = d?.end_date ?? e.end_date ?? null;
	const mode = d?.mode ?? e.mode ?? null;
	const loc = [e.hq_city, e.hq_country].filter(Boolean).join(', ');
	const site = extUrl(e.website);

	return (
		<Drawer open={!!id} onClose={onClose} ariaLabel="Event details">
			{e.name ? (
				<>
					<DrawerHead onClose={onClose}>
						<Logo co={{ name: e.name, website: e.website }} size={40} radius={7} />
						<div style={{ flex: 1, minWidth: 0 }}>
							<div className="co-drawer-name" style={{ cursor: 'default' }}>{e.name}</div>
							{site && <a href={site} target="_blank" rel="noopener noreferrer" className="co-drawer-url">{e.website!.replace(/^https?:\/\//, '')}</a>}
						</div>
					</DrawerHead>
					<DrawerBody>
						{d?.cover_url && (
							// eslint-disable-next-line @next/next/no-img-element -- external event artwork of unknown host
							<img src={d.cover_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 14, objectFit: 'cover', maxHeight: 200 }} />
						)}
						{e.description && <p className="co-drawer-desc">{e.description}</p>}
						<div className="co-kv-list">
							{start && <KV label={end && end !== start ? 'Starts' : 'Date'} value={fmt(start)} />}
							{end && end !== start && <KV label="Ends" value={fmt(end)} />}
							{mode && <KV label="Format" value={MODE_LABEL[mode] ?? mode} />}
							{loc && <KV label="Location" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{e.hq_country && <Flag cc={e.hq_country} size={12} />} {loc}</span>} />}
							{!!sports.data?.length && <KV label="Sports" value={<span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>{sports.data.map((s) => <Tag key={s.id}>{s.name}</Tag>)}</span>} />}
						</div>
						{d?.discount_code && (
							<div className="card" style={{ padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
								<TagIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
								<div style={{ minWidth: 0 }}>
									<div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Discount code</div>
									<div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, userSelect: 'all' }}>{d.discount_code}</div>
									{d.discount_description && <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 4 }}>{d.discount_description}</div>}
								</div>
							</div>
						)}
					</DrawerBody>
					{site && (
						<DrawerFoot>
							<a className="btn" href={site} target="_blank" rel="noopener noreferrer">Visit event website <ArrowUpRight size={12} /></a>
						</DrawerFoot>
					)}
				</>
			) : (
				<DrawerBody><div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{entity.error ? 'This event could not be loaded.' : 'Loading…'}</div></DrawerBody>
			)}
		</Drawer>
	);
}
