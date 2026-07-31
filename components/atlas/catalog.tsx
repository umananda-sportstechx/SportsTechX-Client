'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Button } from './kit';

/**
 * Shared bits for the founder catalog tabs (Investors "All", Market "All
 * companies", Programs & Events). Small on purpose — each catalog owns its own
 * fields/filters; only the country options, the toggle chip, and the pager are
 * common enough to share.
 */

/**
 * Country filter options. The OPTION VALUE is a CSV of every spelling that
 * country appears under in the data — the investors/companies/ecosystem `country`
 * filters all split CSV and match any, so one option catches every variant
 * (e.g. the DB stores both "USA" and "United States"; "UK" and "United Kingdom").
 * Ordered by rough frequency in the dataset.
 */
export const COUNTRY_OPTIONS: [string, string][] = [
	['USA,United States', 'United States'],
	['UK,United Kingdom', 'United Kingdom'],
	['India', 'India'], ['Singapore', 'Singapore'], ['France', 'France'],
	['Australia', 'Australia'], ['Germany', 'Germany'], ['Hong Kong', 'Hong Kong'],
	['Canada', 'Canada'], ['Israel', 'Israel'], ['Spain', 'Spain'], ['Brazil', 'Brazil'],
	['UAE,United Arab Emirates', 'United Arab Emirates'], ['The Netherlands,Netherlands', 'Netherlands'],
	['Sweden', 'Sweden'], ['China', 'China'], ['Switzerland', 'Switzerland'], ['Belgium', 'Belgium'],
	['Japan', 'Japan'], ['Italy', 'Italy'], ['Denmark', 'Denmark'], ['South Korea', 'South Korea'],
	['Ireland', 'Ireland'], ['Portugal', 'Portugal'], ['Finland', 'Finland'], ['Luxembourg', 'Luxembourg'],
	['Saudi Arabia', 'Saudi Arabia'],
];

// ── Reference-data filter options ────────────────────────────────────────────
/** Leaf sectors as [id, "Root → Sub → Leaf"] options (filter by sector_id — no
 *  slug dependency, and leaf ids match how companies/theses are tagged). */
export function useSectorOptions(): [string, string][] {
	const { data } = useSWR<Array<{ id: string; name: string; parent_id: string | null }>>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		const list = data ?? [];
		const byId = new Map(list.map((s) => [s.id, s]));
		const path = (s: { name: string; parent_id: string | null }): string => {
			const parts = [s.name]; let p = s.parent_id;
			while (p) { const par = byId.get(p); if (!par) break; parts.unshift(par.name); p = par.parent_id; }
			return parts.join(' → ');
		};
		const isLeaf = (id: string) => !list.some((x) => x.parent_id === id);
		return list.filter((s) => isLeaf(s.id)).map((s) => [s.id, path(s)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data]);
}

/** Sports as [id, name] options (filter by sport_id). */
export function useSportOptions(): [string, string][] {
	const { data } = useSWR<Array<{ id: string; name: string }> | { data: Array<{ id: string; name: string }> }>(qk.reference.sports(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		const list = Array.isArray(data) ? data : (data?.data ?? []);
		return list.map((s) => [s.id, s.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data]);
}

/** Round types as [slug, name] options (filter by round_type_slug). */
export function useRoundTypeOptions(): [string, string][] {
	const { data } = useSWR<Array<{ name: string; slug: string }> | { data: Array<{ name: string; slug: string }> }>(qk.reference.roundTypes(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		const list = Array.isArray(data) ? data : (data?.data ?? []);
		return list.map((r) => [r.slug, r.name] as [string, string]);
	}, [data]);
}

/** Bucket options that map to a `*_min` numeric filter. */
export const FUNDING_BUCKETS: [string, string][] = [['1000000', '$1M+'], ['10000000', '$10M+'], ['50000000', '$50M+'], ['100000000', '$100M+']];
export const DEALS_BUCKETS: [string, string][] = [['1', '1+ deals'], ['3', '3+ deals'], ['5', '5+ deals'], ['10', '10+ deals']];
export const SINCE_YEARS: [string, string][] = [['2024', 'Since 2024'], ['2022', 'Since 2022'], ['2020', 'Since 2020'], ['2015', 'Since 2015'], ['2010', 'Since 2010']];
export const MONTHS: [string, string][] = [
	['1', 'January'], ['2', 'February'], ['3', 'March'], ['4', 'April'], ['5', 'May'], ['6', 'June'],
	['7', 'July'], ['8', 'August'], ['9', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];

/** A fixed-min-width wrapper so a select doesn't collapse in the flex filter bar. */
export function FSelect({ children, minWidth = 150 }: { children: React.ReactNode; minWidth?: number }) {
	return <div style={{ minWidth }}>{children}</div>;
}

/** A toggle filter rendered as an outline button that highlights when active. */
export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button className="atlas-btn atlas-btn--outline atlas-btn--sm" aria-pressed={active} onClick={onClick}
			style={active ? { borderColor: 'var(--a-navy)', color: 'var(--a-navy)', background: 'var(--a-navy-soft)' } : undefined}>
			{children}
		</button>
	);
}

/** Prev / "Page X of Y" / Next. Renders nothing when there's a single page. */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
	if (totalPages <= 1) return null;
	return (
		<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 22 }}>
			<span style={{ fontSize: 12, color: 'var(--a-faint)', marginRight: 6 }}>Page {page} of {totalPages}</span>
			<Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /></Button>
			<Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={14} /></Button>
		</div>
	);
}

/** Standard auto-fill card grid used across the catalogs. */
export function CardGrid({ children }: { children: React.ReactNode }) {
	return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 14 }}>{children}</div>;
}
