'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { FileText, Code, ArrowRight, KeyRound } from 'lucide-react';
import { Page, SectionHead, Tag } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';
import { qk } from '@/lib/query-keys';

/**
 * InvestorData (i-data) — pipe matched dealflow into the user's stack. API key
 * management is wired to the real /api/me/api-keys surface; CRM sync feeds and
 * one-click exports are not built yet (clearly marked).
 */

interface ApiKeyRow { id: string; name?: string | null; last_used_at?: string | null; created_at?: string }

const EXPORTS = ['Matched dealflow · CSV', 'Full portfolio · XLSX', 'Market maps · JSON'];

const FEEDS = [
	{ name: 'Salesforce', desc: 'New matches → CRM as leads' },
	{ name: 'Affinity', desc: 'Sync tracked companies + notes' },
	{ name: 'Notion', desc: 'Push diligence memos to a database' },
];

export default function InvestorDataPage() {
	const { data: keys } = useSWR<ApiKeyRow[]>(qk.apiKeys.list());
	const count = keys?.length ?? 0;

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Data & API"
				title="Data & API"
				sub="Pipe matched dealflow and the underlying database straight into your stack."
			/>

			<div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="API access" meta="Pro" action={<Link className="btn ghost" href="/api-keys">Manage keys <ArrowRight size={12} /></Link>} />
					<div style={{ padding: 'var(--space-4)' }}>
						<div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
							<div className="cp-feed-ico"><KeyRound size={15} /></div>
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: 600, fontSize: 14 }}>{count} active API key{count === 1 ? '' : 's'}</div>
								<div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Generate and rotate keys on the API keys page.</div>
							</div>
						</div>
						<p style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>
							Use your key to query the SportsTechX API. See the <Link href="/api-docs" className="ai-link">API reference</Link> for endpoints and rate limits.
						</p>
					</div>
				</div>

				<div className="card">
					<SectionHead title="Exports" meta="coming soon" />
					<div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
						{EXPORTS.map((e) => (
							<button key={e} className="btn ghost cp-export" disabled title="Exports are coming soon"><FileText size={14} /> {e}</button>
						))}
					</div>
				</div>
			</div>

			<div className="card">
				<SectionHead title="CRM sync feed" meta="coming soon" />
				<div style={{ padding: '0 var(--space-3) var(--space-3)' }}>
					{FEEDS.map((f) => (
						<div key={f.name} className="cp-feed-row">
							<div className="cp-feed-ico"><Code size={15} /></div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
								<div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>{f.desc}</div>
							</div>
							<Tag>Soon</Tag>
						</div>
					))}
				</div>
			</div>
		</Page>
	);
}
