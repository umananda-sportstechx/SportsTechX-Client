'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Search, Bell, ArrowRight } from 'lucide-react';
import { Page, SectionHead, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';
import { qk } from '@/lib/query-keys';

/**
 * InvestorSourcing (i-sourcing) — sportstech companies currently raising
 * (live from /api/companies?is_actively_raising) + the investor's saved searches
 * (live). Deal alerts are delivered via the daily digest email for saved
 * searches with notifications on.
 */

interface CompanyRow {
	id: string; name: string; slug?: string | null;
	hq_city?: string | null; hq_country?: string | null; last_round_type?: string | null;
}
interface CompaniesResponse { data: CompanyRow[] }
interface SavedSearch { id: string; name: string; page: string; filters?: Record<string, unknown> | null }

const PAGE_ROUTE: Record<string, string> = {
	startup: '/companies', dealflow: '/funding', investors: '/investors', programs: '/programs', ma_deals: '/ma',
};

export default function InvestorSourcingPage() {
	const { data: comps, isLoading } = useSWR<CompaniesResponse>(
		qk.companies.list({ is_actively_raising: true, sort: '-created_at', limit: 12 }),
		{ dedupingInterval: 5 * 60_000 },
	);
	const { data: searches } = useSWR<SavedSearch[]>(qk.savedSearches.list());
	const sourced = comps?.data ?? [];
	const saved = searches ?? [];

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Sourcing"
				title="Sourcing"
				sub="Sportstech companies currently raising, freshest first. Save a search on any catalog page to get a daily email digest when new matches appear."
			/>

			<div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
				<div className="card match-list-lg">
					<SectionHead title="Companies raising now" meta="freshest first" action={<Link className="btn ghost" href="/companies?is_actively_raising=true">All <ArrowRight size={12} /></Link>} />
					{isLoading ? (
						<div style={{ padding: 'var(--space-4)' }}><Empty msg="Loading…" /></div>
					) : sourced.length === 0 ? (
						<div style={{ padding: 'var(--space-4)' }}><Empty msg="No companies are flagged as raising right now." /></div>
					) : (
						<div className="match-list">
							{sourced.map((s) => {
								const loc = [s.hq_city, s.hq_country].filter(Boolean).join(', ');
								const note = [s.last_round_type, loc].filter(Boolean).join(' · ');
								return (
									<Link key={s.id} href={`/companies/${s.slug ?? s.id}`} className="match-row" style={{ textDecoration: 'none', color: 'inherit' }}>
										<div className="match-main">
											<div className="match-name">{s.name} <span className="src-raising">RAISING</span></div>
											<div className="match-sub">{note || '—'}</div>
										</div>
										<ArrowRight size={14} style={{ color: 'var(--fg-muted)' }} />
									</Link>
								);
							})}
						</div>
					)}
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<div className="card">
						<SectionHead title="Saved searches" action={<Link className="btn ghost" href="/companies">New <ArrowRight size={12} /></Link>} />
						<div style={{ padding: 'var(--space-4)' }}>
							{saved.length === 0 ? (
								<Empty msg="No saved searches yet. Save filters from any catalog page." />
							) : (
								saved.map((s) => {
									const route = PAGE_ROUTE[s.page] ?? '/companies';
									const n = s.filters ? Object.keys(s.filters).length : 0;
									return (
										<Link key={s.id} href={route} className="cp-search-row" style={{ textDecoration: 'none', color: 'inherit' }}>
											<Search size={15} />
											<div style={{ flex: 1, minWidth: 0 }}>
												<div className="cp-search-name">{s.name}</div>
												<div className="cp-search-meta">{s.page} · {n} filter{n === 1 ? '' : 's'}</div>
											</div>
										</Link>
									);
								})
							)}
						</div>
					</div>

					<div className="card cp-alert-card">
						<SectionHead title="Deal alerts" meta="daily digest" />
						<div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
							<div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
								<Bell size={15} className="cp-bell-on" style={{ flexShrink: 0, marginTop: 2 }} />
								<span>Saved searches with notifications on email you a daily digest when new matches appear.</span>
							</div>
							<Link href="/settings?tab=notifications" className="btn ghost" style={{ marginTop: 12 }}>
								Manage alerts <ArrowRight size={12} />
							</Link>
						</div>
					</div>
				</div>
			</div>
		</Page>
	);
}
