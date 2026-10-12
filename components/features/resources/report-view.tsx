'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowUpLeft, ArrowUpRight, Check, Download, FileText, Lock } from 'lucide-react';
import { Action, Empty, Loading, cx } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import { downloadReport, viewReport } from '@/lib/report-pdf';
import type { ReportListItem } from '@/types/api';
import { fmtLongDate } from './resource-library';
import './report-view.css';

/**
 * One report: cover, summary, and its PDF editions.
 *
 * There was no report page at all — every library card ended in a "Not
 * connected" tag, though all 33 reports have a PDF and the API has long minted
 * tier-gated signed URLs for them. Built in the featured-post card's language,
 * since no Figma frame exists for it.
 *
 * Editions come from `/versions`, already filtered to what this tier may open.
 * So a report that has a Premium edition the viewer cannot see is detected from
 * `has_pro_version` with no paid version in the list, and gets an upgrade note
 * rather than a button that 404s.
 */
interface Version {
	id: string;
	language_code: string | null;
	access_tier: string;
	title: string | null;
	description: string | null;
	summary_points: string | null;
	cover_url: string | null;
}

const langName = (code: string | null) => {
	if (!code) return 'Edition';
	try { return new Intl.DisplayNames(undefined, { type: 'language' }).of(code) ?? code.toUpperCase(); }
	catch { return code.toUpperCase(); }
};

export function ReportView({ slug }: { slug: string }) {
	const report = useSWR<ReportListItem>(qk.reports.detail(slug));
	const versions = useSWR<Version[]>(qk.reports.versions(slug));
	const [picked, setPicked] = useState<string | null>(null);

	if (report.isLoading) return <Loading />;
	const r = report.data;
	if (!r) return <Empty>Report not found. <Link href={hrefOf('reports')}>Back to reports</Link></Empty>;

	const list = versions.data ?? [];
	const current = list.find((v) => v.id === picked) ?? list.find((v) => v.language_code === 'en') ?? list[0];
	const points = (current?.summary_points ?? '').split(';').map((s) => s.trim()).filter(Boolean);
	const premiumHidden = r.has_pro_version && !list.some((v) => v.access_tier !== 'explore');
	const date = r.report_year ? fmtLongDate(`${r.report_year}-${String(r.report_month ?? 1).padStart(2, '0')}-01`) : '';

	return (
		<article className="atlas-rv">
			<Action icon={<ArrowUpLeft />} href={hrefOf('reports')}>All reports</Action>

			<section className="atlas-rv__hero">
				<div className="atlas-rv__cover">
					{(current?.cover_url ?? r.cover_url)
						// eslint-disable-next-line @next/next/no-img-element
						? <img src={current?.cover_url ?? r.cover_url ?? ''} alt={`${r.title} cover`} />
						: <FileText size={28} strokeWidth={1.25} aria-hidden="true" />}
				</div>

				<div className="atlas-rv__body">
					<div className="atlas-post__meta">
						<FileText size={12} strokeWidth={1.5} aria-hidden="true" />
						<span>Report</span>
						{date && <><span aria-hidden="true">·</span><span>{date}</span></>}
						<span aria-hidden="true">·</span>
						<span className={r.has_pro_version ? 'is-premium' : undefined}>{r.has_pro_version ? 'Premium' : 'Free'}</span>
					</div>
					<h1 className="atlas-rv__title">{r.title}</h1>
					{(current?.description ?? r.description) && <p className="atlas-rv__desc">{current?.description ?? r.description}</p>}

					{points.length > 0 && (
						<div className="atlas-rv__points">
							<div className="atlas-rv__label">Inside this report</div>
							<ul>{points.map((p) => <li key={p}><Check size={13} strokeWidth={2} aria-hidden="true" />{p}</li>)}</ul>
						</div>
					)}

					{list.length > 1 && (
						<div className="atlas-rv__editions">
							<div className="atlas-rv__label">Edition</div>
							<div className="atlas-rv__pills" role="radiogroup" aria-label="Report edition">
								{list.map((v) => (
									<button
										key={v.id}
										type="button"
										role="radio"
										aria-checked={v.id === current?.id}
										className={cx('atlas-rv__pill', v.id === current?.id && 'on')}
										onClick={() => setPicked(v.id)}
									>
										{langName(v.language_code)}{v.access_tier !== 'explore' ? ' · Premium' : ''}
									</button>
								))}
							</div>
						</div>
					)}

					<div className="atlas-post__actions">
						{current ? (
							<>
								<Action icon={<ArrowUpRight />} onClick={() => void viewReport(r.slug ?? r.id, current.id)}>View report</Action>
								<Action icon={<Download />} onClick={() => void downloadReport(r.slug ?? r.id, current.id)}>Download report</Action>
							</>
						) : versions.isLoading ? (
							<span className="atlas-rv__note">Loading editions…</span>
						) : (
							<span className="atlas-rv__note">This report has no edition available on your plan.</span>
						)}
					</div>

					{premiumHidden && (
						<p className="atlas-rv__upsell">
							<Lock size={12} strokeWidth={1.75} aria-hidden="true" />
							A Premium edition with the full dataset is available on paid plans. <Link href={hrefOf('plans')}>Compare plans</Link>
						</p>
					)}
				</div>
			</section>
		</article>
	);
}
