'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Drawer, DrawerHead, DrawerTabs, DrawerBody, DrawerFoot } from '@/components/ui/drawer';
import { KV, Tag } from '@/components/ui/atoms';
import { Logo, Flag } from '@/components/atlas';
import '@/app/company-detail.css';

/** What the programs list already knows about a row — shown at once, before the fetches land. */
export interface ProgramRow {
	id: string; name: string; website: string | null; description: string | null;
	category: string | null; hq_country: string | null; hq_city: string | null;
}
interface ProgramEntity extends ProgramRow { founded_year?: number | null; latest_activity_year?: number | null }
interface ProgramDetails {
	duration_label: string | null; interval_label: string | null; investment_label: string | null; equity_label: string | null;
	stage_label: string | null; cohort_size: number | null; virtual_mode: 'yes' | 'no' | 'hybrid' | null;
	has_office_space: boolean | null; latest_cohort_year: number | null; details: string | null; entries_open: boolean;
}
interface Linked { id: string; name: string; entity_type: string; relationship_type: string }
interface Participation { id: string; company_id: string | null; startup_name_snapshot: string | null; startup_website_snapshot: string | null; cohort_name: string | null; cohort_year: number | null }

const extUrl = (u: string | null | undefined) => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : undefined);
const FORMAT: Record<string, string> = { yes: 'Virtual', no: 'In person', hybrid: 'Hybrid' };

/**
 * Program details in the right-side drawer, as the old Intelligence Hub showed
 * them: the program's terms (duration, investment, equity, stage, cohort),
 * linked initiatives/events, and a Portfolio tab of the startups that took part.
 * Opened from the programs table and cards; `?program=<id>` makes it shareable.
 */
export function ProgramDrawer({ id, row, onClose }: { id: string | null; row?: ProgramRow; onClose: () => void }) {
	const [tab, setTab] = useState<'general' | 'portfolio'>('general');
	const entity = useSWR<ProgramEntity>(id ? qk.ecosystem.detail(id) : null);
	const details = useSWR<ProgramDetails | null>(id ? [`/api/ecosystem-entities/${id}/program-details`] : null);
	const links = useSWR<{ parents: Linked[]; children: Linked[] }>(id ? [`/api/ecosystem-entities/${id}/relationships`] : null);
	const cohort = useSWR<{ data: Participation[]; total: number }>(id ? qk.ecosystem.participations({ program_entity_id: id, limit: 200 }) : null);

	const e = { ...(entity.data ?? {}), ...(row ?? {}) } as ProgramEntity;
	const d = details.data;
	const loc = [e.hq_city, e.hq_country].filter(Boolean).join(', ');
	const site = extUrl(e.website);
	const linked = [...(links.data?.parents ?? []), ...(links.data?.children ?? [])];
	const startups = cohort.data?.data ?? [];
	const close = () => { setTab('general'); onClose(); };

	return (
		<Drawer open={!!id} onClose={close} ariaLabel="Program details">
			{e.name ? (
				<>
					<DrawerHead onClose={close}>
						<Logo co={{ name: e.name, website: e.website }} size={40} radius={7} />
						<div style={{ flex: 1, minWidth: 0 }}>
							<div className="co-drawer-name" style={{ cursor: 'default' }}>{e.name}</div>
							{site && <a href={site} target="_blank" rel="noopener noreferrer" className="co-drawer-url">{e.website!.replace(/^https?:\/\//, '')}</a>}
						</div>
						{d?.entries_open && <Tag variant="pos">Entries open</Tag>}
					</DrawerHead>
					<DrawerTabs
						tabs={[{ key: 'general', label: 'General' }, { key: 'portfolio', label: 'Portfolio', count: cohort.data?.total ?? startups.length }]}
						current={tab}
						onTab={(k) => setTab(k as 'general' | 'portfolio')}
					/>
					<DrawerBody>
						{tab === 'general' ? (
							<>
								{e.description && <p className="co-drawer-desc">{e.description}</p>}
								<div className="co-kv-list">
									{e.category && <KV label="Type" value={e.category} />}
									{loc && <KV label="Location" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{e.hq_country && <Flag cc={e.hq_country} size={12} />} {loc}</span>} />}
									{e.founded_year && <KV label="Founded" value={e.founded_year} />}
									{d?.duration_label && <KV label="Duration" value={d.duration_label} />}
									{d?.interval_label && <KV label="Runs" value={d.interval_label} />}
									{d?.investment_label && <KV label="Investment" value={d.investment_label} />}
									{d?.equity_label && <KV label="Equity" value={d.equity_label} />}
									{d?.stage_label && <KV label="Stage" value={d.stage_label} />}
									{d?.cohort_size && <KV label="Cohort size" value={d.cohort_size} />}
									{d?.virtual_mode && <KV label="Format" value={FORMAT[d.virtual_mode] ?? d.virtual_mode} />}
									{d?.has_office_space && <KV label="Office space" value="Provided" />}
									{d?.latest_cohort_year && <KV label="Latest cohort" value={d.latest_cohort_year} />}
								</div>
								{d?.details && <p className="co-drawer-desc" style={{ whiteSpace: 'pre-line' }}>{d.details}</p>}
								{linked.length > 0 && (
									<div className="co-kv-list">
										{linked.map((l) => <KV key={`${l.id}-${l.relationship_type}`} label={l.entity_type === 'event' ? 'Event' : l.entity_type === 'initiative' ? 'Initiative' : 'Program'} value={l.name} />)}
									</div>
								)}
							</>
						) : startups.length === 0 ? (
							<div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{cohort.isLoading ? 'Loading…' : 'No startups recorded for this program yet.'}</div>
						) : (
							<div className="co-kv-list">
								{startups.map((p) => {
									const name = p.startup_name_snapshot ?? 'Unnamed startup';
									const when = [p.cohort_name, p.cohort_year].filter(Boolean).join(' · ');
									return (
										<KV key={p.id}
											label={p.company_id
												? <Link href={`/companies/${p.company_id}`} style={{ color: 'var(--fg)', fontWeight: 600 }}>{name}</Link>
												: <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{name}</span>}
											value={when || '—'} />
									);
								})}
							</div>
						)}
					</DrawerBody>
					{site && (
						<DrawerFoot>
							<a className="btn" href={site} target="_blank" rel="noopener noreferrer">Visit program website <ArrowUpRight size={12} /></a>
						</DrawerFoot>
					)}
				</>
			) : (
				<DrawerBody><div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{entity.error ? 'This program could not be loaded.' : 'Loading…'}</div></DrawerBody>
			)}
		</Drawer>
	);
}
