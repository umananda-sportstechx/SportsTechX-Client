'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Check, Send } from 'lucide-react';
import { Page, Empty, Logo } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * FounderMatches (f-matches) — investors ranked against the founder's claimed
 * company by the live matching endpoint (GET /api/recommendations/investors).
 */

interface InvestorMatch {
	id: string;
	name: string;
	slug: string | null;
	website: string | null;
	category: string | null;
	description: string | null;
	score: number;
	match_reasons: string[];
}

interface MatchResponse {
	company: { id: string; name: string } | null;
	reason?: 'no_company_claim';
	results: InvestorMatch[];
}

interface IntroRequest { target_investor_id: string }

export default function FounderMatchesPage() {
	const { data, isLoading } = useSWR<MatchResponse>(qk.investorMatches(24));
	const { data: intros, mutate: mutateIntros } = useSWR<IntroRequest[]>(qk.introRequests());
	const [busy, setBusy] = useState<string | null>(null);

	const results = data?.results ?? [];
	const company = data?.company;
	const requested = new Set((intros ?? []).map((i) => i.target_investor_id));

	const requestIntro = async (investorId: string) => {
		setBusy(investorId);
		// Optimistic — mark requested immediately.
		void mutateIntros((prev) => [...(prev ?? []), { target_investor_id: investorId }], { revalidate: false });
		try {
			const res = await apiRequest('POST', '/api/intro-requests', { target_investor_id: investorId });
			if (!res.ok) throw new Error(String(res.status));
			toast.success('Intro requested — our team will follow up.');
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not request intro');
			void mutateIntros(); // rollback to server truth
		} finally {
			setBusy(null);
			void mutateIntros();
		}
	};

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Investors"
				title="Investor matches"
				sub={company
					? `Funds ranked against ${company.name}'s stage, sector and geography — best fit first.`
					: 'Funds ranked against your company’s stage, sector and geography.'}
			/>

			{isLoading ? (
				<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" /> Scoring investors…
				</div>
			) : !company ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="Claim and verify your company to see investor matches." />
					<div style={{ marginTop: 12, textAlign: 'center' }}>
						<Link href="/get-verified" className="btn">Get verified <ArrowRight size={12} /></Link>
					</div>
				</div>
			) : results.length === 0 ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="No strong investor matches yet. As more investor theses are added, matches will appear here." />
				</div>
			) : (
				<div className="card match-list-lg">
					<div className="match-list">
						{results.map((m) => {
							const href = `/investors/${m.slug ?? m.id}`;
							const fit = Math.min(100, m.score);
							return (
								<div key={m.id} className="match-row match-row-page">
									<Logo co={{ name: m.name, website: m.website }} size={36} />
									<div className="match-main">
										<div className="match-name">{m.name}</div>
										<div className="match-sub">{[m.category, m.description].filter(Boolean).join(' · ') || '—'}</div>
										<div className="match-why">{m.match_reasons.map((w) => <span key={w} className="match-chip">{w}</span>)}</div>
									</div>
									<div className="match-fit match-fit-page">
										<div className="match-fit-num">{fit}<span>%</span></div>
										<FitBar pct={fit} />
										<div className="match-fit-lbl">fit</div>
									</div>
									<div className="match-cta" style={{ display: 'flex', gap: 6 }}>
										{requested.has(m.id) ? (
											<button className="btn ghost" disabled><Check size={12} /> Requested</button>
										) : (
											<button className="btn" disabled={busy === m.id} onClick={() => void requestIntro(m.id)}>
												<Send size={12} /> {busy === m.id ? 'Requesting…' : 'Request intro'}
											</button>
										)}
										<Link href={href} className="btn ghost">View <ArrowRight size={12} /></Link>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</Page>
	);
}
