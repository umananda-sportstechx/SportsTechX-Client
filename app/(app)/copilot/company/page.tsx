'use client';

import { ArrowRight, Check, Heart } from 'lucide-react';
import { Page, SectionHead, Flag } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';

/**
 * FounderCompany (f-company) — the founder's own profile + Locker Room report.
 * Demo-grade sample data (Hoopers).
 */
export default function FounderCompanyPage() {
	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · My company"
				title="My company"
				sub="The profile the ecosystem sees — keep it accurate, verified and raise-ready."
			/>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Profile" meta="Verified" />
					<div style={{ padding: 'var(--space-4)' }}>
						<div className="cp-co-row">
							<div style={{ width: 56, height: 56, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20 }}>HO</div>
							<div>
								<div className="cp-co-name" style={{ fontSize: 18 }}>
									Hoopers <Heart size={13} style={{ color: 'var(--accent)', fill: 'currentColor' }} />
								</div>
								<div className="cp-co-meta"><Flag cc="GB" /> London, UK · Founded 2019 · 38 people</div>
							</div>
						</div>
						<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 16 }}>
							Fan-engagement platform turning matchday moments into recurring revenue for clubs and rights holders.
							Live across 40+ teams in football and basketball.
						</p>
						<div className="cp-verify-bar">
							<Check size={18} />
							<div>
								<b>Verified profile</b>
								<span>Last confirmed Apr 2026 — data shown to investors comes from you.</span>
							</div>
							<button className="btn ghost">Edit</button>
						</div>
					</div>
				</div>

				<div className="card">
					<SectionHead title="Locker Room report" meta="diligence-ready" />
					<div style={{ padding: 'var(--space-4)' }}>
						<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 16 }}>
							Your single shareable link — traction, cap table, team and market position, kept in sync with your STX profile.
						</p>
						<div className="cp-locker-stats">
							<div><b>$14.2M</b><span>committed</span></div>
							<div><b>$8.6M</b><span>raised to date</span></div>
							<div><b>Top 18%</b><span>cohort rank</span></div>
						</div>
						<button className="btn cp-full">Open Locker Room report <ArrowRight size={12} /></button>
					</div>
				</div>
			</div>
		</Page>
	);
}
