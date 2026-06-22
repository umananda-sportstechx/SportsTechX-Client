'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Building2, Search, Loader2, Sparkles } from 'lucide-react';
import { Page, SectionHead, Flag, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';
import { ScoreRing } from '@/components/copilot/workspace-charts';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * InvestorDiligence (i-diligence) — pick a target company, then draft a
 * diligence memo from STX data + an LLM pass (GET /api/recommendations/diligence).
 */

const INVESTOR_BLUE = 'oklch(62% 0.20 255)';
const scoreColor = (s: number) => (s >= 80 ? 'var(--pos)' : s >= 70 ? 'oklch(70% 0.16 60)' : 'var(--neg)');

interface CompanyHit { id: string; name: string; slug?: string | null }
interface SearchResponse { results?: { companies?: CompanyHit[] } }
interface DiligenceSection { key: string; label: string; score: number; note: string }
interface DiligenceMemo {
	company: { id: string; name: string; sector: string | null; country: string | null; city: string | null } | null;
	overall: number; summary: string; sections: DiligenceSection[];
}

export default function InvestorDiligencePage() {
	const [q, setQ] = useState('');
	const [selected, setSelected] = useState<CompanyHit | null>(null);
	const [memo, setMemo] = useState<DiligenceMemo | null>(null);
	const [running, setRunning] = useState(false);

	const { data: search } = useSWR<SearchResponse>(q.trim().length >= 2 ? qk.search.typeahead(q.trim(), ['companies']) : null, { dedupingInterval: 30_000 });
	const hits = search?.results?.companies ?? [];

	const run = async (c: CompanyHit) => {
		setRunning(true);
		setMemo(null);
		try {
			const res = await apiRequest('GET', `/api/recommendations/diligence?company=${encodeURIComponent(c.slug ?? c.id)}`);
			if (!res.ok) {
				const b = await res.json().catch(() => null) as { error?: { message?: string } } | null;
				toast.error(b?.error?.message ?? 'Could not generate the memo.');
				return;
			}
			setMemo((await res.json()) as DiligenceMemo);
		} catch (e) {
			toast.error((e as Error).message ?? 'Diligence failed');
		} finally {
			setRunning(false);
		}
	};

	const pick = (c: CompanyHit) => { setSelected(c); setQ(''); void run(c); };

	const initials = (memo?.company?.name ?? selected?.name ?? '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Diligence"
				title="Diligence copilot"
				sub="Pick a target company and draft a diligence memo from STX data — review, edit and take it into your IC."
			/>

			{/* Company picker */}
			<div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
				<div className="co-stat-label" style={{ marginBottom: 8 }}>Target company</div>
				<div style={{ position: 'relative' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<Search size={15} style={{ color: 'var(--fg-muted)' }} />
						<input
							className="search-input"
							style={{ flex: 1 }}
							placeholder="Search a company to run diligence on…"
							value={q}
							onChange={(e) => setQ(e.target.value)}
						/>
					</div>
					{hits.length > 0 && (
						<div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, maxHeight: 280, overflowY: 'auto' }}>
							{hits.map((c) => (
								<button key={c.id} className="ai-history-item" onClick={() => pick(c)}>
									<span className="ai-history-title">{c.name}</span>
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{running ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Drafting memo for {selected?.name}…</div>
				</div>
			) : !memo ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="Search and select a company above to draft a diligence memo." />
				</div>
			) : (
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
					<div className="card" style={{ padding: 'var(--space-4)' }}>
						<div className="cp-mini-head"><Building2 size={16} /> Subject</div>
						<div className="cp-dd-co">
							<div style={{ width: 48, height: 48, background: INVESTOR_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{initials}</div>
							<div>
								<div className="cp-co-name">{memo.company?.name}</div>
								<div className="cp-co-meta">
									{memo.company?.country && <Flag cc={memo.company.country.slice(0, 2).toUpperCase()} />}
									{[memo.company?.city, memo.company?.country, memo.company?.sector].filter(Boolean).join(' · ') || '—'}
								</div>
							</div>
						</div>
						<div className="cp-dd-overall">
							<ScoreRing score={memo.overall} label="memo" color={INVESTOR_BLUE} />
						</div>
						{memo.summary && (
							<p style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.55, marginTop: 12 }}>
								<Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{memo.summary}
							</p>
						)}
					</div>

					<div className="card">
						<SectionHead title="Memo sections" meta="drafted from STX data" />
						<div style={{ padding: 'var(--space-4)' }}>
							{memo.sections.length === 0 ? (
								<Empty msg="The model returned no sections — try again." />
							) : memo.sections.map((s) => (
								<div key={s.key} className="cp-dd-section">
									<div className="cp-dd-sec-top">
										<span className="cp-dd-sec-label">{s.label}</span>
										<span className="cp-dd-sec-score" style={{ color: scoreColor(s.score) }}>{s.score}</span>
									</div>
									<FitBar pct={s.score} color={scoreColor(s.score)} />
									<div className="cp-dd-sec-note">{s.note}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</Page>
	);
}
