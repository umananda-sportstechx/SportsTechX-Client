'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Chip, Empty } from '@/components/ui/atoms';

interface EcosystemEntity {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	entity_type?: string | null;
	status?: string | null;
	cohort_label?: string | null;
	cohort_number?: number | null;
	investment_amount?: number | string | null;
	investment_label?: string | null;
	duration_label?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	application_deadline?: string | null;
	color?: string | null;
}

interface EcosystemResponse {
	data: EcosystemEntity[];
	total: number;
	page: number;
	totalPages: number;
}

// PLACEHOLDER — STX_DATA.PROGRAMS verbatim, displayed when API returns none.
const MOCK_PROGRAMS: Array<{
	id: string; name: string; desc: string; cc: string; location: string;
	status: 'open' | 'closing_soon' | 'closed'; cohort: string; investment: string; duration: string; color: string;
}> = [
	{ id: 'mp-1', name: 'Stadia Ventures Accelerator', desc: '14-week sports & esports accelerator with $100K investment and direct industry mentorship.', cc: 'US', location: 'St. Louis',    status: 'open',         cohort: 'Cohort 11',    investment: '$100K',           duration: '14 wks', color: '#84CC16' },
	{ id: 'mp-2', name: 'Comcast NBC Sports Tech',     desc: 'Strategic accelerator pairing growth-stage sports tech startups with Comcast NBC for live pilots.', cc: 'US', location: 'Philadelphia', status: 'open',         cohort: "Class of '26",  investment: '$50K + pilots',   duration: '12 wks', color: '#7C3AED' },
	{ id: 'mp-3', name: 'Techstars Sports',            desc: 'Global sports accelerator powered by Techstars network. Partnership with major leagues.', cc: 'US', location: 'Indianapolis', status: 'closing_soon', cohort: 'Cohort 9',     investment: '$120K',           duration: '13 wks', color: '#22C55E' },
	{ id: 'mp-4', name: 'LeAD Sports & Health Tech',   desc: 'Berlin-based accelerator co-founded by Olympic medalists. Health and performance focus.', cc: 'DE', location: 'Berlin',        status: 'open',         cohort: "Spring '26",   investment: '€100K',           duration: '6 mo',   color: '#0EA5E9' },
	{ id: 'mp-5', name: 'Atleti Lab',                  desc: "Atlético de Madrid's innovation engine. Partnership pilots with the LaLiga club.", cc: 'ES', location: 'Madrid',        status: 'open',         cohort: 'Edition III',  investment: 'Pilots',          duration: '8 mo',   color: '#DC2626' },
	{ id: 'mp-6', name: 'AO StartUps',                 desc: "Tennis Australia's accelerator. Demo at Australian Open. Equity-free.", cc: 'AU', location: 'Melbourne',     status: 'closed',       cohort: '2026',         investment: 'A$50K',           duration: '6 mo',   color: '#F59E0B' },
	{ id: 'mp-7', name: 'Arena Hub',                   desc: "Latin America's largest sports tech innovation centre.", cc: 'BR', location: 'São Paulo',     status: 'open',         cohort: "Q3 '26",       investment: 'Variable',        duration: '4 mo',   color: '#10B981' },
	{ id: 'mp-8', name: 'IBM Sports Tech Challenge',   desc: 'Global program spotlighting AI-driven sports tech startups. Cloud credits & enterprise pilots.', cc: 'US', location: 'Global',        status: 'open',         cohort: '2026',         investment: '$50K credits',    duration: '6 wks',  color: '#1E40AF' },
	{ id: 'mp-9', name: 'Atos MENA HQ',                desc: 'Atos Sports Technology Centre of Excellence in Saudi Arabia.', cc: 'SA', location: 'Riyadh',        status: 'open',         cohort: 'Cohort 2',     investment: 'TBC',             duration: '6 mo',   color: '#0F766E' },
];

const STATUS_CHIPS: Array<{ label: string; key: string }> = [
	{ label: 'Open',          key: 'open' },
	{ label: 'Closing soon',  key: 'closing_soon' },
	{ label: 'Closed',        key: 'closed' },
];

const FALLBACK_COLORS = [
	'#A855F7', '#0F172A', '#22D3EE', '#94A3B8', '#0EA5E9', '#A78BFA',
];

export default function ProgramsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [status, setStatus] = useState(params.get('status') ?? '');
	const [page, setPage] = useState(Number(params.get('page') ?? '1'));

	const updateUrl = (updates: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		Object.entries(updates).forEach(([k, v]) => {
			if (v == null || v === '') sp.delete(k);
			else sp.set(k, String(v));
		});
		router.push(`${pathname}?${sp.toString()}`, { scroll: false });
	};

	const queryParams: Record<string, unknown> = { page, limit: 24 };
	if (status) queryParams.status = status;

	const { data, isLoading } = useQuery<EcosystemResponse>({
		queryKey: qk.ecosystem.listByType('program', queryParams),
		staleTime: 5 * 60_000,
	});

	const programsApi = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;
	const useMock = !isLoading && programsApi.length === 0;
	const displayed = useMock
		? (status ? MOCK_PROGRAMS.filter((p) => p.status === status) : MOCK_PROGRAMS)
		: programsApi;
	const displayTotal = useMock ? displayed.length : (total || displayed.length);

	const handleStatusChip = (key: string) => {
		const next = status === key ? '' : key;
		setStatus(next);
		setPage(1);
		updateUrl({ status: next || null, page: null });
	};

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						marginBottom: 6,
					}}
				>
					Ecosystem · accelerators
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: '0 0 6px',
					}}
				>
					Programs
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 720, margin: 0 }}>
					Sports-tech accelerators, incubators and innovation programs — application status, terms, and partners.
				</p>
			</div>

			<div className="filter-bar" style={{ marginBottom: 'var(--space-4)' }}>
				<Chip active={!status} count={displayTotal} onClick={() => handleStatusChip('')}>
					All
				</Chip>
				{STATUS_CHIPS.map((c) => (
					<Chip key={c.key} active={status === c.key} onClick={() => handleStatusChip(c.key)}>
						{c.label}
					</Chip>
				))}
			</div>

			{isLoading && programsApi.length === 0 ? (
				<Empty msg="Loading…" />
			) : displayed.length === 0 ? (
				<Empty msg="No programs in this state" />
			) : (
				<div className="prog-grid">
					{useMock
						? (displayed as typeof MOCK_PROGRAMS).map((p, i) => (
							<MockProgramCard key={p.id} p={p} i={i} />
						))
						: (displayed as EcosystemEntity[]).map((p, i) => (
							<ProgramCard key={p.id} p={p} i={i} />
						))}
				</div>
			)}

			{totalPages > 1 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 24 }}>
					<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginRight: 8 }}>
						Page {page} of {totalPages}
					</span>
					<button
						className="btn ghost"
						disabled={page <= 1}
						onClick={() => { const next = page - 1; setPage(next); updateUrl({ page: next }); }}
					>
						<ChevronLeft size={14} />
					</button>
					<button
						className="btn ghost"
						disabled={page >= totalPages}
						onClick={() => { const next = page + 1; setPage(next); updateUrl({ page: next }); }}
					>
						<ChevronRight size={14} />
					</button>
				</div>
			)}
		</Page>
	);
}

function MockProgramCard({ p, i }: { p: typeof MOCK_PROGRAMS[number]; i: number }) {
	const color = p.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
	const statusClass = p.status === 'open' ? 'on' : p.status === 'closing_soon' ? 'warn' : 'off';
	return (
		<div className="card prog-card">
			<div className="prog-cover" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)` }}>
				<div className="prog-cohort">{p.cohort}</div>
				<div className="prog-name">{p.name}</div>
				<div className={`prog-status ${statusClass}`}>
					<span className="live-dot" /> {formatStatus(p.status)}
				</div>
			</div>
			<div style={{ padding: 'var(--space-4)' }}>
				<p
					style={{
						fontSize: 13,
						color: 'var(--fg-2)',
						lineHeight: 1.5,
						minHeight: 60,
						marginBottom: 12,
						display: '-webkit-box',
						WebkitLineClamp: 3,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					}}
				>
					{p.desc}
				</p>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 12,
						paddingTop: 12,
						borderTop: '1px solid var(--border)',
					}}
				>
					<div>
						<div className="co-stat-label">Investment</div>
						<div className="co-stat-val">{p.investment}</div>
					</div>
					<div>
						<div className="co-stat-label">Duration</div>
						<div className="co-stat-val">{p.duration}</div>
					</div>
					<div>
						<div className="co-stat-label">Location</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>
							<Flag cc={p.cc} /> {p.location}
						</div>
					</div>
					<div>
						<div className="co-stat-label">Status</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>{formatStatus(p.status)}</div>
					</div>
				</div>
				<button className="btn ghost" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}>
					Apply <ArrowRight size={12} />
				</button>
			</div>
		</div>
	);
}

function ProgramCard({ p, i }: { p: EcosystemEntity; i: number }) {
	const color = p.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
	// Status fallback: derive from prototype distribution if API doesn't supply.
	const status = p.status ?? pickMockStatus(p.id);
	const statusClass = status === 'open' ? 'on' : status === 'closing_soon' ? 'warn' : 'off';
	const ccReal = p.hq_country ? countryCode(p.hq_country) : '';
	const cc = ccReal || pickMockCountryCode(p.id);
	const location = p.hq_city ?? p.hq_country ?? pickMockLocation(p.id);
	const cohort = p.cohort_label ?? pickMockCohort(p.id);
	const investment = p.investment_label ?? formatDollars(p.investment_amount) ?? pickMockInvestment(p.id);
	const duration = p.duration_label ?? pickMockDuration(p.id);
	return (
		<div className="card prog-card">
			<div className="prog-cover" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)` }}>
				<div className="prog-cohort">{cohort}</div>
				<div className="prog-name">{p.name}</div>
				<div className={`prog-status ${statusClass}`}>
					<span className="live-dot" /> {formatStatus(status)}
				</div>
			</div>
			<div style={{ padding: 'var(--space-4)' }}>
				<p
					style={{
						fontSize: 13,
						color: 'var(--fg-2)',
						lineHeight: 1.5,
						minHeight: 60,
						marginBottom: 12,
						display: '-webkit-box',
						WebkitLineClamp: 3,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					}}
				>
					{p.description ?? pickMockDesc(p.id)}
				</p>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 12,
						paddingTop: 12,
						borderTop: '1px solid var(--border)',
					}}
				>
					<div>
						<div className="co-stat-label">Investment</div>
						<div className="co-stat-val">{investment}</div>
					</div>
					<div>
						<div className="co-stat-label">Duration</div>
						<div className="co-stat-val">{duration}</div>
					</div>
					<div>
						<div className="co-stat-label">Location</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>
							<Flag cc={cc} /> {location}
						</div>
					</div>
					<div>
						<div className="co-stat-label">Deadline</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>
							{p.application_deadline ? formatShortDate(p.application_deadline) : pickMockDeadline(p.id)}
						</div>
					</div>
				</div>
				<Link href={`/programs/${p.slug ?? p.id}`} style={{ textDecoration: 'none' }}>
					<button className="btn ghost" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}>
						Apply <ArrowRight size={12} />
					</button>
				</Link>
			</div>
		</div>
	);
}

const MOCK_PROG_COUNTRIES: Array<{ name: string; cc: string; city: string }> = [
	{ name: 'United States',  cc: 'US', city: 'St. Louis' },
	{ name: 'Germany',        cc: 'DE', city: 'Berlin' },
	{ name: 'United Kingdom', cc: 'GB', city: 'London' },
	{ name: 'India',          cc: 'IN', city: 'Bangalore' },
	{ name: 'Spain',          cc: 'ES', city: 'Madrid' },
	{ name: 'Brazil',         cc: 'BR', city: 'São Paulo' },
	{ name: 'Australia',      cc: 'AU', city: 'Melbourne' },
	{ name: 'Singapore',      cc: 'SG', city: 'Singapore' },
];

function pickMockCountryCode(id: string): string {
	return MOCK_PROG_COUNTRIES[hash(id) % MOCK_PROG_COUNTRIES.length].cc;
}
function pickMockLocation(id: string): string {
	const c = MOCK_PROG_COUNTRIES[hash(id) % MOCK_PROG_COUNTRIES.length];
	return `${c.city}, ${c.name}`;
}
function pickMockStatus(id: string): string {
	const opts = ['open', 'open', 'open', 'closing_soon', 'closed'];
	return opts[hash(id) % opts.length];
}
function pickMockDesc(id: string): string {
	const opts = [
		'Strategic accelerator pairing growth-stage sports tech startups with industry partners for live pilots.',
		'Global sports accelerator powered by an established network. Partnership with major leagues.',
		'Health and performance focused program co-founded by Olympic medalists.',
		'14-week accelerator with capital and direct industry mentorship.',
		'Equity-free program closing demo at a major tournament.',
	];
	return opts[hash(id) % opts.length];
}
function pickMockDeadline(id: string): string {
	const opts = ['Jun 15, 2026', 'Jul 30, 2026', 'Sep 01, 2026', 'Q3 2026', 'Rolling'];
	return opts[hash(id) % opts.length];
}

function pickMockCohort(id: string): string {
	const opts = ["Spring '26", "Q3 '26", 'Cohort 9', 'Edition III', "Class of '26"];
	return opts[hash(id) % opts.length];
}
function pickMockInvestment(id: string): string {
	const opts = ['$50K', '$100K', '$120K', '€100K', 'TBC'];
	return opts[hash(id) % opts.length];
}
function pickMockDuration(id: string): string {
	const opts = ['6 wks', '12 wks', '13 wks', '14 wks', '6 mo', '8 mo'];
	return opts[hash(id) % opts.length];
}
function hash(id: string): number {
	return (id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0) + (id.length || 0);
}

function formatStatus(s: string | null | undefined): string {
	switch (s) {
		case 'open': return 'Open';
		case 'closing_soon': return 'Closing soon';
		case 'closed': return 'Closed';
		default: return s ?? '—';
	}
}

function formatDollars(value: number | string | null | undefined): string | null {
	if (value == null) return null;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return null;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
