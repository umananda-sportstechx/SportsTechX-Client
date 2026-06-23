'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { FileText, Code, ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { Page, SectionHead, Tag } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * InvestorData (i-data) — pipe matched dealflow into the user's stack. API key
 * management + CSV/JSON exports are live; CRM sync connectors (OAuth) are not
 * built yet (clearly marked).
 */

interface ApiKeyRow { id: string; name?: string | null; last_used_at?: string | null; created_at?: string }

/** Trigger a browser download of `content` as a file. */
function downloadFile(name: string, content: string, mime: string): void {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url; a.download = name;
	document.body.appendChild(a); a.click(); a.remove();
	URL.revokeObjectURL(url);
}

/** CSV-escape a value (quote if it contains comma/quote/newline). */
function csvCell(v: unknown): string {
	const s = v == null ? '' : String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
	return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
}

const FEEDS = [
	{ name: 'Salesforce', desc: 'New matches → CRM as leads' },
	{ name: 'Affinity', desc: 'Sync tracked companies + notes' },
	{ name: 'Notion', desc: 'Push diligence memos to a database' },
];

export default function InvestorDataPage() {
	const { data: keys } = useSWR<ApiKeyRow[]>(qk.apiKeys.list());
	const count = keys?.length ?? 0;
	const [busy, setBusy] = useState<string | null>(null);

	// Export matched dealflow (companies actively raising) as CSV.
	const exportDealflow = async () => {
		setBusy('csv');
		try {
			const res = await apiRequest('GET', '/api/companies?is_actively_raising=true&sort=-created_at&limit=200');
			const rows = ((await res.json()) as { data?: Array<Record<string, unknown>> }).data ?? [];
			const csv = toCsv(
				['Company', 'Website', 'Sector', 'City', 'Country', 'Last round'],
				rows.map((r) => [r.name, r.website, r.primary_sector ?? r.sector_name, r.hq_city, r.hq_country, r.last_round_type]),
			);
			downloadFile(`stx-dealflow-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
		} catch (e) { toast.error((e as Error).message ?? 'Export failed'); } finally { setBusy(null); }
	};

	// Export the sector market map as JSON.
	const exportMarketMaps = async () => {
		setBusy('json');
		try {
			const res = await apiRequest('GET', '/api/analytics/sector-heat?period=all&limit=30');
			const data = await res.json();
			downloadFile(`stx-market-maps-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
		} catch (e) { toast.error((e as Error).message ?? 'Export failed'); } finally { setBusy(null); }
	};

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
					<SectionHead title="Exports" />
					<div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
						<button className="btn ghost cp-export" disabled={busy === 'csv'} onClick={() => void exportDealflow()}>
							{busy === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Matched dealflow · CSV
						</button>
						<button className="btn ghost cp-export" disabled={busy === 'json'} onClick={() => void exportMarketMaps()}>
							{busy === 'json' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Market maps · JSON
						</button>
						<button className="btn ghost cp-export" disabled title="XLSX export is coming soon"><FileText size={14} /> Full portfolio · XLSX</button>
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
