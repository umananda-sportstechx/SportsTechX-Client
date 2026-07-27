'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Sparkles, Pencil, ArrowRight } from 'lucide-react';
import { Page, SectionHead, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';
import { qk } from '@/lib/query-keys';

/**
 * InvestorThesis (i-thesis) — the investor's thesis that powers matching, read
 * live from their claimed/verified investor record. Editing happens through the
 * claim flow (the investor-thesis builder), linked from here.
 */

interface ClaimRow { id: string; claim_type: string; target_investor_id?: string | null; is_verified: boolean }
interface NamedRef { id: string; name: string; slug: string }
interface ThesisBundle {
	thesis: { amount_min_usd: number | string | null; amount_max_usd: number | string | null } | null;
	sectors: NamedRef[];
	sports: NamedRef[];
	tech_tags: NamedRef[];
	round_types: NamedRef[];
	revenue_stages: string[];
	geo: Array<{ scope_type: string; scope_value: string }>;
}

function fmtUsd(v: number | string | null | undefined): string | null {
	if (v == null) return null;
	const n = typeof v === 'string' ? Number(v) : v;
	if (!Number.isFinite(n) || n <= 0) return null;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n}`;
}

export default function InvestorThesisPage() {
	const { data: claims } = useSWR<ClaimRow[]>(qk.claims.mine());
	const investorClaim = (claims ?? []).find((c) => c.claim_type === 'investor') ?? null;
	const investorId = investorClaim?.target_investor_id ?? null;
	const { data: t, isLoading } = useSWR<ThesisBundle>(investorId ? qk.investors.thesis(investorId) : null);

	const cheque = t?.thesis
		? [fmtUsd(t.thesis.amount_min_usd), fmtUsd(t.thesis.amount_max_usd)].filter(Boolean).join(' – ')
		: '';
	const geoLabels = (t?.geo ?? []).map((g) => g.scope_value);

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · My thesis"
				title="Your investment thesis"
				sub="The focus and parameters that power every match, alert and digest — kept in sync with your verified investor profile."
				action={<Link href="/get-verified" className="btn"><Pencil size={14} /> Edit thesis</Link>}
			/>

			{!investorClaim ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="Claim and verify your fund to set up your thesis." />
					<div style={{ marginTop: 12, textAlign: 'center' }}>
						<Link href="/get-verified" className="btn">Claim your fund <ArrowRight size={12} /></Link>
					</div>
				</div>
			) : isLoading ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}><Empty msg="Loading your thesis…" /></div>
			) : (
				<>
					<div className="cp-thesis-src cp-thesis-src-page">
						<Sparkles size={13} /> {investorClaim.is_verified ? 'From your verified investor profile' : 'From your investor claim · pending verification'}
					</div>

					<div className="grid-2">
						<div className="card">
							<SectionHead title="Focus" />
							<div style={{ padding: 'var(--space-4)' }}>
								<ChipBlock label="Sectors" items={(t?.sectors ?? []).map((s) => s.name)} />
								<ChipBlock label="Stages" items={(t?.round_types ?? []).map((r) => r.name)} />
								<ChipBlock label="Sports" items={(t?.sports ?? []).map((s) => s.name)} />
								<ChipBlock label="Geographies" items={geoLabels} />
							</div>
						</div>

						<div className="card">
							<SectionHead title="Parameters" />
							<div style={{ padding: 'var(--space-4)' }}>
								<div className="cp-thesis-edit">
									<div className="cp-thesis-edit-label">Cheque size</div>
									<div className="cp-thesis-edit-body"><b style={{ fontSize: 16 }}>{cheque || '—'}</b></div>
								</div>
								<ChipBlock label="Tech tags" items={(t?.tech_tags ?? []).map((x) => x.name)} />
								<ChipBlock label="Revenue stages" items={(t?.revenue_stages ?? []).map(prettyStage)} />
							</div>
						</div>
					</div>
				</>
			)}
		</Page>
	);
}

function prettyStage(s: string): string {
	return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ChipBlock({ label, items }: { label: string; items: string[] }) {
	return (
		<div className="cp-thesis-edit">
			<div className="cp-thesis-edit-label">{label}</div>
			<div className="cp-thesis-edit-body">
				{items.length === 0 ? <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Not set</span> : items.map((it) => <span key={it} className="chip chip-on">{it}</span>)}
			</div>
		</div>
	);
}
