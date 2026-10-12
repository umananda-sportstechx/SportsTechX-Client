'use client';

import useSWR from 'swr';
import { Card, ComboBarLine, Empty, Loading, PageHead, PieDonut, barAt, type ComboPoint, type PieSegment } from '@/components/atlas';
import { fmtCount, fmtUsd, fmtUsdB, place } from '@/components/features/market/format';
import { qk } from '@/lib/query-keys';
import './verified-report.css';

/**
 * The verified-company report, on screen at last.
 *
 * The generator, the queue, the owner-scoped API (`/verified-reports/mine` and
 * `/:id`) and the "your report is ready" email have all been live for months.
 * The page the email links to never existed, so nine real reports sat behind a
 * 404 and the only way to read one was a SQL client.
 *
 * `report_data` is an opaque `jsonb` column server-side, so the shapes below
 * were read off the live rows rather than inferred from the generator — all
 * nine agree on them. Each section guards its own slice: an older report that
 * predates a chart should drop that card, not the page.
 */
interface Company {
	name?: string; website?: string; description?: string; sector?: string; sport?: string;
	tech_tag?: string; business_model?: string; city?: string; country?: string;
	region?: string; continent?: string; founded_year?: number;
}
interface ReportData {
	company?: Company;
	marketOverview?: { headline?: string; bullets?: string[]; paragraphs?: string[] };
	marketCharts?: {
		funding5yByYear?: { year: number; totalUsd: number; dealCount: number }[];
		businessModelBreakdown?: { model: string | null; count: number; totalUsd: number }[];
		subSubSectorBreakdown?: { name: string; totalUsd: number }[];
		topCountries?: { country: string; totalUsd: number; dealCount: number }[];
	};
	competitors?: { id: string; name: string; website?: string | null; description?: string | null; business_model?: string | null }[];
	investors?: { id: string; name: string; website?: string | null; category?: string | null; dealsCount?: number | null; description?: string | null }[];
	ecosystem?: { kind?: string; name: string; website?: string | null; category?: string | null; description?: string | null }[];
	generatedAt?: string;
}
interface ReportRow {
	id: string;
	status: string;
	company_website: string | null;
	report_data: ReportData | null;
	error: string | null;
	created_at: string;
}

const title = (s?: string | null) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()) : '');
/** Strip the scheme for display; the href keeps it. */
const host = (u?: string | null) => (u ? u.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '');
const href = (u?: string | null) => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : undefined);

export function VerifiedReport({ id }: { id: string }) {
	const { data, isLoading, error } = useSWR<ReportRow>(qk.verifiedReports.detail(id));

	if (isLoading) return <Loading />;
	if (error || !data) return <Empty>We couldn&rsquo;t open that report. It may not be yours.</Empty>;

	// A failure and an unfinished run are different states and read differently:
	// one needs re-running, the other needs waiting.
	if (data.status === 'error') {
		return (
			<>
				<PageHead title="Report unavailable" sub={host(data.company_website)} />
				<Empty>This report failed to generate. The SportsTechX team can re-run it &mdash; {data.error ?? 'no further detail was recorded'}.</Empty>
			</>
		);
	}
	const d = data.report_data;
	if (!d || data.status !== 'ready') {
		return (
			<>
				<PageHead title="Report in progress" sub={host(data.company_website)} />
				<Empty>This report is still being generated. We&rsquo;ll email you when it&rsquo;s ready.</Empty>
			</>
		);
	}

	const c = d.company ?? {};
	const charts = d.marketCharts ?? {};
	const funding: ComboPoint[] = (charts.funding5yByYear ?? []).map((r) => ({
		year: r.year, amt: r.totalUsd, deals: r.dealCount,
	}));
	// Business model is counted by deals and sized by capital. The bars show
	// capital, with the deal count in the row label, so neither figure is lost.
	const models: PieSegment[] = (charts.businessModelBreakdown ?? []).map((r, i) => ({
		name: title(r.model) || 'Unspecified',
		v: r.totalUsd,
		color: barAt(i),
		label: `${fmtUsd(r.totalUsd)} · ${fmtCount(r.count)} deals`,
	}));
	const countries: PieSegment[] = (charts.topCountries ?? []).map((r, i) => ({
		name: r.country, v: r.totalUsd, color: barAt(i),
		label: `${fmtUsd(r.totalUsd)} · ${fmtCount(r.dealCount)} deals`,
	}));
	const subSectors: PieSegment[] = (charts.subSubSectorBreakdown ?? []).map((r, i) => ({
		name: r.name, v: r.totalUsd, color: barAt(i), label: fmtUsd(r.totalUsd),
	}));

	const facts: [string, string][] = [
		['Sector', c.sector ?? '—'],
		['Sport', c.sport ?? '—'],
		['Business model', title(c.business_model) || '—'],
		['Technology', c.tech_tag ?? '—'],
		['Headquarters', place(c.city, c.country) || '—'],
		['Region', c.region ?? c.continent ?? '—'],
		['Founded', c.founded_year ? String(c.founded_year) : '—'],
	];
	const site = c.website ?? data.company_website;

	return (
		<>
			<PageHead
				title={c.name ?? host(data.company_website) ?? 'Verified company report'}
				sub={`Verified company report${d.generatedAt ? ` · generated ${new Date(d.generatedAt).toLocaleDateString()}` : ''}`}
			/>

			<Card>
				{c.description && <p className="vcr-lede">{c.description}</p>}
				<dl className="vcr-facts">
					{facts.map(([k, v]) => (
						<div key={k} className="vcr-facts__row">
							<dt className="atlas-eyebrow">{k}</dt>
							<dd>{v}</dd>
						</div>
					))}
				</dl>
				{href(site) && (
					<a className="vcr-link" href={href(site)} target="_blank" rel="noreferrer noopener">
						{host(site)} &rarr;
					</a>
				)}
			</Card>

			{d.marketOverview && !!(d.marketOverview.headline || d.marketOverview.bullets?.length || d.marketOverview.paragraphs?.length) && (
				<Card>
					<div className="atlas-section-title">Market overview</div>
					{d.marketOverview.headline && <p className="vcr-headline">{d.marketOverview.headline}</p>}
					{!!d.marketOverview.bullets?.length && (
						<ul className="vcr-bullets">
							{d.marketOverview.bullets.map((b) => <li key={b}>{b}</li>)}
						</ul>
					)}
					{d.marketOverview.paragraphs?.map((p) => <p key={p} className="vcr-para">{p}</p>)}
				</Card>
			)}

			{funding.length > 0 && (
				<Card className="atlas-chart-card">
					<div className="atlas-chart-card__head">
						<div className="atlas-section-title">Sector funding by year</div>
						<div className="atlas-section-note">Bars = capital raised &middot; Line = rounds</div>
					</div>
					<div className="atlas-chart-card__body">
						<ComboBarLine
							data={funding}
							valueFormatter={fmtUsdB}
							barGradient
							lineColor="var(--a-chart-line)"
							dotColor="var(--a-chart-dot)"
							showValues={false}
							gridDashed={false}
							barLabel="Funding"
							lineLabel="Rounds"
						/>
					</div>
				</Card>
			)}

			<div className="vcr-split">
				{models.length > 0 && (
					<Card>
						<div className="atlas-section-title">Capital by business model</div>
						<div className="atlas-section-note">How money splits across models in this sector</div>
						<PieDonut mode="bar" segments={models} />
					</Card>
				)}
				{countries.length > 0 && (
					<Card>
						<div className="atlas-section-title">Top countries</div>
						<div className="atlas-section-note">Where capital is deployed</div>
						<PieDonut mode="bar" segments={countries} />
					</Card>
				)}
				{subSectors.length > 0 && (
					<Card>
						<div className="atlas-section-title">Capital by sub-sector</div>
						<div className="atlas-section-note">Adjacent sub-sectors by cumulative funding</div>
						<PieDonut mode="bar" segments={subSectors} />
					</Card>
				)}
			</div>

			{!!d.competitors?.length && (
				<Card>
					<div className="atlas-section-title">Comparable companies</div>
					<div className="atlas-section-note">Closest matches on sector and model</div>
					<ul className="vcr-list">
						{d.competitors.map((x) => (
							<li key={x.id} className="vcr-list__row">
								<span className="vcr-list__name">{x.name}</span>
								{x.business_model && <span className="vcr-list__tag">{title(x.business_model)}</span>}
								{x.description && <span className="vcr-list__desc">{x.description}</span>}
								{href(x.website) && <a className="vcr-list__link" href={href(x.website)} target="_blank" rel="noreferrer noopener">{host(x.website)}</a>}
							</li>
						))}
					</ul>
				</Card>
			)}

			{!!d.investors?.length && (
				<Card>
					<div className="atlas-section-title">Active investors</div>
					<div className="atlas-section-note">Funds and angels investing in this sector</div>
					<ul className="vcr-list">
						{d.investors.map((x) => (
							<li key={x.id} className="vcr-list__row">
								<span className="vcr-list__name">{x.name}</span>
								{x.category && <span className="vcr-list__tag">{title(x.category)}</span>}
								{x.dealsCount != null && <span className="vcr-list__tag">{fmtCount(x.dealsCount)} deals</span>}
								{/* Investor blurbs run to several paragraphs; clamped in CSS. */}
								{x.description && <span className="vcr-list__desc">{x.description}</span>}
								{href(x.website) && <a className="vcr-list__link" href={href(x.website)} target="_blank" rel="noreferrer noopener">{host(x.website)}</a>}
							</li>
						))}
					</ul>
				</Card>
			)}

			{!!d.ecosystem?.length && (
				<Card>
					<div className="atlas-section-title">Programmes and events</div>
					<div className="atlas-section-note">Accelerators, competitions and events in this space</div>
					<ul className="vcr-list">
						{d.ecosystem.map((x) => (
							<li key={`${x.kind}-${x.name}`} className="vcr-list__row">
								<span className="vcr-list__name">{x.name}</span>
								{x.category && <span className="vcr-list__tag">{x.category}</span>}
								{x.description && <span className="vcr-list__desc">{x.description}</span>}
								{href(x.website) && <a className="vcr-list__link" href={href(x.website)} target="_blank" rel="noreferrer noopener">{host(x.website)}</a>}
							</li>
						))}
					</ul>
				</Card>
			)}
		</>
	);
}
