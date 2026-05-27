'use client';

/**
 * Tri-state sortable column header — ported from
 * `ui_design_2/app/filter-rail.jsx:303-367`.
 *
 * Click cycle: off → asc → desc → off
 *
 * State shape: `{ key: string; dir: 'asc' | 'desc' } | null`
 *
 * Two usage modes:
 *   1. Server-side: write `sort.key` and `sort.dir` into the SWR query param.
 *      Backend handles `sort=field` (asc) / `sort=-field` (desc).
 *   2. Client-side: pass rows + accessors to `applySort(rows, sort, accessors)`.
 *      Used when the dataset is small and already in-hand.
 */

export interface SortState {
	key: string;
	dir: 'asc' | 'desc';
}

interface SortHeaderProps {
	label: string;
	sortKey: string;
	sort: SortState | null;
	setSort: (s: SortState | null) => void;
	align?: 'left' | 'right' | 'center';
	width?: number | string;
	className?: string;
	defaultDir?: 'asc' | 'desc';
}

export function SortHeader({
	label, sortKey, sort, setSort, align = 'left', width, className = '', defaultDir = 'asc',
}: SortHeaderProps) {
	const active = sort?.key === sortKey;
	const dir = active ? sort!.dir : null;
	const onClick = () => {
		if (!active) setSort({ key: sortKey, dir: defaultDir });
		else if (dir === defaultDir) setSort({ key: sortKey, dir: defaultDir === 'asc' ? 'desc' : 'asc' });
		else setSort(null);
	};
	return (
		<th
			onClick={onClick}
			className={`sortable ${active ? 'on' : ''} ${className}`}
			style={{ textAlign: align, width, cursor: 'pointer', userSelect: 'none' }}
			aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
		>
			<span className="sort-label">{label}</span>
			<span className="sort-icon" aria-hidden="true">
				{!active && (
					<svg width="8" height="10" viewBox="0 0 8 10" fill="none">
						<path d="M4 0L7 4H1z" fill="currentColor" opacity="0.4" />
						<path d="M4 10L1 6H7z" fill="currentColor" opacity="0.4" />
					</svg>
				)}
				{active && dir === 'asc' && (
					<svg width="8" height="10" viewBox="0 0 8 10" fill="none">
						<path d="M4 0L7 4H1z" fill="currentColor" />
					</svg>
				)}
				{active && dir === 'desc' && (
					<svg width="8" height="10" viewBox="0 0 8 10" fill="none">
						<path d="M4 10L1 6H7z" fill="currentColor" />
					</svg>
				)}
			</span>
		</th>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const _MONTHS: Record<string, number> = {
	Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
	Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/** Parse "May 14" / "Mar '24" → sortable integer (MMDD or just MM*100). */
export function parseMonthDay(s: string | null | undefined): number {
	if (!s) return 0;
	const m = String(s).match(/([A-Za-z]{3})\s*(\d+)?/);
	if (!m) return 0;
	const month = _MONTHS[m[1] as keyof typeof _MONTHS] ?? 0;
	const day = parseInt(m[2] ?? '0', 10);
	return month * 100 + day;
}

/**
 * Parse "$450M", "4B", "12.5", "undisclosed" → comparable number (M units).
 * Used for sorting deal-amount columns when the value is a display string.
 */
export function parseMoney(v: unknown): number | null {
	if (v == null) return null;
	if (typeof v === 'number') return v;
	const s = String(v).toLowerCase().replace(/[$,\s]/g, '');
	if (s === 'undisclosed' || s === '—' || s === '-') return null;
	const m = s.match(/([\d.]+)\s*([kmb])?/);
	if (!m) return null;
	let n = parseFloat(m[1]);
	if (m[2] === 'b') n *= 1000;
	else if (m[2] === 'k') n /= 1000;
	return n;
}

/**
 * Client-side sort. `accessors` is a map of `sortKey → (row) => value`.
 * Nulls always sort last regardless of direction.
 */
export function applySort<T>(
	rows: T[],
	sort: SortState | null,
	accessors: Record<string, (row: T) => unknown>,
): T[] {
	if (!sort) return rows;
	const get = accessors[sort.key];
	if (!get) return rows;
	const dir = sort.dir === 'desc' ? -1 : 1;
	const out = [...rows];
	out.sort((a, b) => {
		const av = get(a);
		const bv = get(b);
		if (av == null && bv == null) return 0;
		if (av == null) return 1;
		if (bv == null) return -1;
		if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
		return String(av).localeCompare(String(bv)) * dir;
	});
	return out;
}

/** Convert SortState → SWR-friendly `sort=field` / `sort=-field` string. */
export function sortToParam(sort: SortState | null): string | undefined {
	if (!sort) return undefined;
	return sort.dir === 'desc' ? `-${sort.key}` : sort.key;
}

/** Inverse of `sortToParam`: read `sort=field` / `sort=-field` back to state. */
export function paramToSort(param: string | null | undefined): SortState | null {
	if (!param) return null;
	if (param.startsWith('-')) return { key: param.slice(1), dir: 'desc' };
	return { key: param, dir: 'asc' };
}
