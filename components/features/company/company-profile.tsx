'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import useSWR from 'swr';
import { ArrowUpLeft, ArrowUpRight, Globe } from 'lucide-react';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import { qk } from '@/lib/query-keys';
import type { Deal } from '@/types/api';
import { Action, Empty, Loading, Logo } from '@/components/atlas';
import { fmtUsd } from '@/components/features/market/format';
import './company-profile.css';

/**
 * Company profile page (Figma "Company" view): header with save / website /
 * return actions, a facts card, description, funding history, and a right rail
 * with recent signals (company news) and related companies. Shared feature —
 * products pass where links go.
 */

interface Company {
	id: string; name: string; slug?: string | null; description?: string | null; website?: string | null;
	custom_logo_url?: string | null; primary_sector?: string | null; primary_sector_slug?: string | null;
	hq_city?: string | null; hq_country?: string | null; founded_year?: number | null;
	total_funding_usd?: number | string | null; last_round_type?: string | null; deal_count?: number | null;
	business_model?: string | null;
}
interface Sport { id: string; name: string; is_primary?: boolean }
interface NewsItem { id: string; title: string; url?: string | null; source?: string | null; summary?: string | null; published_at?: string | null }
interface Similar { id: string; name: string; slug?: string | null; hq_city?: string | null; hq_country?: string | null; last_round_type?: string | null; primary_sector?: string | null }

interface SectorRef { id: string; name: string; slug: string; parent_id?: string | null }

const BUSINESS_MODELS: Record<string, string> = { b2b: 'B2B', b2c: 'B2C', b2b2c: 'B2B2C', d2c: 'D2C', b2g: 'B2G', other: 'Other' };
const asList = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { data?: T[] } | null)?.data ?? [])) as T[];
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
function ago(d?: string | null): string {
	if (!d) return '';
	const days = Math.round((Date.now() - new Date(d).getTime()) / 864e5);
	if (days < 1) return 'today';
	if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
	if (days < 60) return `${Math.round(days / 7)} weeks ago`;
	if (days < 730) return `${Math.round(days / 30)} months ago`;
	return `${Math.round(days / 365)} years ago`;
}
const place = (city?: string | null, country?: string | null) => [city, country].filter(Boolean).join(', ');

export function CompanyProfile({ idOrSlug, backHref, companyHref, listHref, railTop }: {
	idOrSlug: string;
	/** "Return to results" target. */
	backHref: string;
	/** Profile URL for another company (related companies). */
	companyHref: (idOrSlug: string) => string;
	/** Company list filtered by sector path, for "View related companies". */
	listHref: (filter: { sector?: string; sub?: string; subsub?: string }) => string;
	/** Product-specific card at the top of the right rail (e.g. Scout's thesis match). */
	railTop?: ReactNode;
}) {
	const detail = useSWR<Company>(qk.companies.detail(idOrSlug));
	const c = detail.data;
	const sports = useSWR<unknown>(c ? qk.companies.sports(idOrSlug) : null);
	const news = useSWR<unknown>(c ? qk.companies.news(idOrSlug) : null);
	const similar = useSWR<unknown>(c ? qk.companies.similar(idOrSlug) : null);
	const deals = useSWR<{ data: Deal[] }>(c ? qk.deals.list({ company_id: c.id, limit: 30, sort: '-announced_date' }) : null);
	const sectors = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });

	// Sector path (pillar › category › sub-category) for the facts card + related link.
	const path = useMemo(() => {
		const list = asList<SectorRef>(sectors.data);
		const byId = new Map(list.map((s) => [s.id, s]));
		let s = list.find((x) => x.slug === c?.primary_sector_slug) ?? null;
		const chain: SectorRef[] = [];
		while (s) { chain.unshift(s); s = s.parent_id ? byId.get(s.parent_id) ?? null : null; }
		return chain;
	}, [sectors.data, c?.primary_sector_slug]);

	if (detail.isLoading) return <Loading />;
	if (!c) return <Empty>Company not found. <Link href={backHref}>Back to companies</Link></Empty>;

	const hq = place(c.hq_city, c.hq_country);
	const raised = fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
	const rounds = c.deal_count ? `${c.deal_count} round${c.deal_count === 1 ? '' : 's'}` : null;
	const website = c.website ? (c.website.startsWith('http') ? c.website : `https://${c.website}`) : null;
	const sportNames = asList<Sport>(sports.data).map((s) => s.name);
	const facts: Array<[string, string]> = [
		['Founded', c.founded_year ? String(c.founded_year) : '—'],
		['Sports', sportNames.length ? sportNames.join(', ') : '—'],
		['Headquarters', hq || '—'],
		['Business model', c.business_model ? (BUSINESS_MODELS[c.business_model.toLowerCase()] ?? c.business_model) : '—'],
		['Category', path[0]?.name ?? '—'],
		['Stage', c.last_round_type ?? '—'],
		['Sub-category', path.length > 1 ? path.slice(1).map((s) => s.name).join(' › ') : (c.primary_sector ?? '—')],
		['Total raised', raised === '—' ? '—' : [raised, rounds].filter(Boolean).join(' · ')],
	];
	const dealRows = deals.data?.data ?? [];
	const newsRows = asList<NewsItem>(news.data).slice(0, 4);
	const related = asList<Similar>(similar.data).slice(0, 5);
	const relatedFilter = { sector: path[0]?.slug, sub: path[1]?.slug, subsub: path[2]?.slug };

	return (
		<article className="atlas-co">
			<header className="atlas-co__head">
				<div className="atlas-co__id">
					<Logo co={{ name: c.name, website: c.website ?? null, custom_logo_url: c.custom_logo_url }} size={104} radius={9} />
					<div>
						<h1 className="atlas-co__name">{c.name}</h1>
						<div className="atlas-co__meta">{[hq, c.founded_year ? `Founded ${c.founded_year}` : null].filter(Boolean).join(' · ')}</div>
					</div>
				</div>
				<div className="atlas-co__actions">
					<SaveToWatchlist companyId={c.id} companyName={c.name} />
					{website && <Action icon={<Globe />} href={website} external>Website</Action>}
					<Action icon={<ArrowUpLeft />} href={backHref}>Return to results</Action>
				</div>
			</header>

			<div className="atlas-co__grid">
				<div className="atlas-co__main">
					<section className="atlas-card atlas-co__facts" aria-label="Key facts">
						{facts.map(([k, v]) => (
							<div key={k}><div className="atlas-co__fact-k">{k}</div><div className="atlas-co__fact-v">{v}</div></div>
						))}
					</section>

					{c.description && (
						<section className="atlas-co__text">
							<h2 className="atlas-co__h">Description</h2>
							<p>{c.description}</p>
						</section>
					)}

					<section className="atlas-card atlas-chart-card atlas-co__funding">
						<div className="atlas-co__card-head">
							<h2 className="atlas-co__h2">Funding history</h2>
							<span className="atlas-co__aside">Disclosed rounds</span>
						</div>
						{deals.isLoading ? <Loading /> : dealRows.length === 0 ? (
							<p className="atlas-co__empty">No disclosed rounds on record.</p>
						) : dealRows.map((d) => (
							<div key={d.id} className="atlas-co__deal">
								<span>{fmtDate(d.announced_date)}</span>
								<span>{d.round_type_name ?? 'Round'}</span>
								<span className="atlas-co__amt">{d.amount_usd == null ? '—' : fmtUsd(Number(d.amount_usd))}</span>
								<span className="atlas-co__investors">{(d.investors?.length ? d.investors : d.lead_investor ? [d.lead_investor] : []).join(', ') || 'Undisclosed'}</span>
							</div>
						))}
					</section>
				</div>

				<aside className="atlas-co__rail">
					{railTop}
					<section className="atlas-card atlas-co__side">
						<h2 className="atlas-co__h">Recent signals</h2>
						{newsRows.length === 0 ? <p className="atlas-co__empty">No recent signals for this company yet.</p> : newsRows.map((n) => (
							<div key={n.id} className="atlas-co__signal">
								<div className="atlas-co__signal-meta">{[n.source ?? 'News', ago(n.published_at)].filter(Boolean).join(' · ')}</div>
								{n.url ? <a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a> : <span>{n.title}</span>}
							</div>
						))}
					</section>

					<section className="atlas-card atlas-co__side">
						<h2 className="atlas-co__h">Related Companies</h2>
						<p className="atlas-co__sub">Similar categories, sports, customers and geographies</p>
						{related.length === 0 ? <p className="atlas-co__empty">No related companies found.</p> : related.map((r) => (
							<Link key={r.id} href={companyHref(r.slug ?? r.id)} className="atlas-co__rel">
								<span>
									<span className="atlas-co__rel-name">{r.name}</span>
									<span className="atlas-co__rel-meta">{[r.last_round_type, place(r.hq_city, r.hq_country)].filter(Boolean).join(' · ') || r.primary_sector}</span>
								</span>
								<span className="atlas-co__rel-go" aria-hidden="true"><ArrowUpRight size={12} /></span>
							</Link>
						))}
						{relatedFilter.sector && <Link href={listHref(relatedFilter)} className="atlas-btn atlas-btn--outline atlas-co__more">View related companies</Link>}
					</section>
				</aside>
			</div>
		</article>
	);
}
