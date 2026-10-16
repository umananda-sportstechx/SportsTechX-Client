'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import useSWR from 'swr';
import { ArrowUpLeft, ArrowUpRight, Globe, Mail } from 'lucide-react';
import { VerifiedBadge } from '@/components/atlas/icons/verified-badge';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import { qk } from '@/lib/query-keys';
import type { Company, Deal } from '@/types/api';
import { Action, Empty, Loading, Logo } from '@/components/atlas';
import { ago, fmtUsd, place } from '@/components/features/market/format';
import { VerifyButton } from '@/components/features/verify/verify-cta';
import { SuggestCorrection } from '@/components/features/verify/suggest-correction';
import './company-profile.css';

/**
 * Company profile page (Figma "Company" view): header with save / website /
 * return actions, a facts card, description, funding history, and a right rail
 * with recent signals (company news) and related companies. Shared feature —
 * products pass where links go.
 */


interface Sport { id: string; name: string; is_primary?: boolean }
interface NewsItem { id: string; title: string; url?: string | null; source?: string | null; summary?: string | null; published_at?: string | null }
interface Similar { id: string; name: string; slug?: string | null; hq_city?: string | null; hq_country?: string | null; last_round_type?: string | null; primary_sector?: string | null }

interface SectorRef { id: string; name: string; slug: string; parent_id?: string | null }

// Brand glyphs as inline SVG — lucide dropped its brand/logo icons, and the
// landing footer already carries these same paths.
const BrandSvg = ({ d }: { d: string }) => (
	<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
const BRAND = {
	linkedin: <BrandSvg d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />,
	x: <BrandSvg d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.4z" />,
	instagram: <BrandSvg d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38A5.86 5.86 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.86 5.86 0 0 0 2.12-1.38 5.86 5.86 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.86 5.86 0 0 0-1.38-2.12A5.86 5.86 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-10.4a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />,
	facebook: <BrandSvg d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79v8.44C19.61 23.08 24 18.09 24 12.07z" />,
	youtube: <BrandSvg d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />,
};

const BUSINESS_MODELS: Record<string, string> = { b2b: 'B2B', b2c: 'B2C', b2b2c: 'B2B2C', d2c: 'D2C', b2g: 'B2G', other: 'Other' };
const asList = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { data?: T[] } | null)?.data ?? [])) as T[];
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

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
	// These three key off `idOrSlug`, which is known on the first render, so
	// they start alongside `detail` rather than waiting for it. They used to be
	// gated on `c` as well, which bought nothing and cost the page a whole
	// serial round trip before any of the rail could load.
	const sports = useSWR<unknown>(qk.companies.sports(idOrSlug));
	const techTags = useSWR<unknown>(qk.companies.techTags(idOrSlug));
	const news = useSWR<unknown>(qk.companies.news(idOrSlug));
	const similar = useSWR<unknown>(qk.companies.similar(idOrSlug));
	// `deals` genuinely has to wait: it keys off the resolved `c.id`, and
	// `idOrSlug` may be a slug.
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
	// Social links come from the joined social_profiles row; render only the ones
	// that exist, never empty links (per the Company type's contract).
	const ext = (u: string | null) => (u ? (/^(https?:|mailto:)/.test(u) ? u : `https://${u}`) : null);
	const socialLinks = ([
		['linkedin', 'LinkedIn', ext(c.linkedin_url), BRAND.linkedin],
		['twitter', 'X (Twitter)', ext(c.twitter_url), BRAND.x],
		['instagram', 'Instagram', ext(c.instagram_url), BRAND.instagram],
		['facebook', 'Facebook', ext(c.facebook_url), BRAND.facebook],
		['youtube', 'YouTube', ext(c.youtube_url), BRAND.youtube],
		['email', 'Email', c.contact_email ? `mailto:${c.contact_email}` : null, <Mail size={15} aria-hidden="true" />],
	] as Array<[string, string, string | null, ReactNode]>).filter((s) => s[2]);
	const sportNames = asList<Sport>(sports.data).map((s) => s.name);
	const tagNames = asList<{ name: string }>(techTags.data).map((t) => t.name);
	const facts: Array<[string, string]> = [
		['Founded', c.founded_year ? String(c.founded_year) : '—'],
		['Sports', sportNames.length ? sportNames.join(', ') : '—'],
		['Tech', tagNames.length ? tagNames.join(', ') : '—'],
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
					<Logo co={{ name: c.name, website: c.website ?? null, custom_logo_url: c.custom_logo_url }} size={72} radius={10} />
					<div>
						<h1 className="atlas-co__name">{c.name}{c.is_verified && <span style={{ marginLeft: 6, display: 'inline-flex', verticalAlign: 'middle' }}><VerifiedBadge size={20} /></span>}</h1>
						<div className="atlas-co__meta">{[hq, c.founded_year ? `Founded ${c.founded_year}` : null].filter(Boolean).join(' · ')}</div>
						{socialLinks.length > 0 && (
							<div className="atlas-co__socials">
								{socialLinks.map(([key, label, href, icon]) => (
									<a key={key} href={href as string} target="_blank" rel="noopener noreferrer" className="atlas-co__social" aria-label={label} title={label}>{icon}</a>
								))}
							</div>
						)}
					</div>
				</div>
				<div className="atlas-co__actions">
					<SaveToWatchlist companyId={c.id} companyName={c.name} />
					{/* The highest-intent moment: they are looking at data about
						    themselves that may be wrong. Pre-filling the target skips
						    the search step the modal would otherwise open with. */}
					<VerifyButton
						role="founder"
						entityId={c.id}
						target={{ role: 'founder', id: c.id, name: c.name, website: c.website ?? undefined, verified: c.is_verified }}
						label="Is this your company?"
						hideWhenVerifiedElsewhere
					/>
					{/* Renders only once their claim on this company is verified. */}
					<SuggestCorrection companyId={c.id} companyName={c.name} current={{
						website: c.website ?? '', description: c.description ?? '',
						hq_city: c.hq_city ?? '', hq_country: c.hq_country ?? '',
						founded_year: c.founded_year ? String(c.founded_year) : '',
						sector: c.primary_sector ?? '', business_model: c.business_model ?? '',
					}} />
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
						) : (
							<div className="atlas-co__deals" role="table" aria-label="Funding rounds">
								<div className="atlas-co__deal atlas-co__deal--head" role="row">
									<span role="columnheader">Date</span>
									<span role="columnheader">Funding Type</span>
									<span role="columnheader">Money Raised</span>
									<span role="columnheader">Lead Investor</span>
								</div>
								{dealRows.map((d) => (
									<div key={d.id} className="atlas-co__deal" role="row">
										<span role="cell">{fmtDate(d.announced_date)}</span>
										<span role="cell">{d.round_type_name ?? 'Round'}</span>
										<span className="atlas-co__amt" role="cell">{d.amount_usd == null ? '—' : fmtUsd(Number(d.amount_usd))}</span>
										<span className="atlas-co__investors" role="cell">{(d.lead_investor ? [d.lead_investor] : d.investors?.length ? d.investors : []).join(', ') || 'Undisclosed'}</span>
									</div>
								))}
							</div>
						)}
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
