'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
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
