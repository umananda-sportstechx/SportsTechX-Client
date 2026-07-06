import { useMemo } from 'react';
import type { Audience } from '@/components/ui/atoms';

export interface SectorRef { id: string; name: string; slug: string; parent_id?: string | null }

/** Map a top-level pillar (name/slug) to its audience for sector icons. */
function pillarAudience(s: SectorRef): Audience {
	const k = `${s.slug} ${s.name}`.toLowerCase();
	if (/athlet|activ|perform/.test(k)) return 'athletes';
	if (/fan|content|media|stream/.test(k)) return 'fans';
	return 'executives';
}

export interface SectorTiers {
	/** Depth-0 sectors (pillars). */
	tops: SectorRef[];
	/** Depth-1 sectors (sub-sectors). */
	subs: SectorRef[];
	/** Depth-2 sectors (sub-sub-sectors). */
	subSubs: SectorRef[];
	/** A slug plus every descendant slug beneath it. */
	expand: (slug: string) => string[];
	/** The audience a sector belongs to (via its top pillar), for sector icons. */
	audienceOf: (slug: string) => Audience | null;
}

/**
 * Split a flat sector list into its three hierarchy tiers (pillar →
 * sub-sector → sub-sub-sector) by walking `parent_id`, and provide an
 * `expand(slug)` that returns a slug plus all descendant slugs.
 *
 * Picking a pillar/sub-sector must filter every leaf beneath it, because the
 * backends match `sector_id` by an exact slug list (leaf-only otherwise). This
 * is the single source of truth shared by the companies, funding, M&A, and
 * investors list pages so their sector facets stay identical.
 */
export function useSectorTiers(sectorList: SectorRef[]): SectorTiers {
	return useMemo(() => {
		const byId = new Map(sectorList.map((s) => [s.id, s]));
		const depthOf = (s: SectorRef) => {
			let d = 0; let cur: SectorRef | undefined = s;
			while (cur?.parent_id && d < 6) { d++; cur = byId.get(cur.parent_id); }
			return d;
		};
		const childrenByParent = new Map<string, string[]>();
		sectorList.forEach((s) => {
			if (!s.parent_id) return;
			const arr = childrenByParent.get(s.parent_id) ?? [];
			arr.push(s.id);
			childrenByParent.set(s.parent_id, arr);
		});
		const bySlug = new Map(sectorList.map((s) => [s.slug, s]));
		const topOf = (s: SectorRef): SectorRef => {
			let cur = s;
			while (cur.parent_id) { const p = byId.get(cur.parent_id); if (!p) break; cur = p; }
			return cur;
		};
		const audienceBySlug = new Map<string, Audience>();
		sectorList.forEach((s) => audienceBySlug.set(s.slug, pillarAudience(topOf(s))));
		const expand = (slug: string): string[] => {
			const root = bySlug.get(slug);
			if (!root) return [slug];
			const out = [slug];
			const stack = [root.id];
			while (stack.length) {
				const id = stack.pop()!;
				for (const cid of childrenByParent.get(id) ?? []) {
					const c = byId.get(cid);
					if (c) { out.push(c.slug); stack.push(cid); }
				}
			}
			return out;
		};
		return {
			tops: sectorList.filter((s) => depthOf(s) === 0),
			subs: sectorList.filter((s) => depthOf(s) === 1),
			// Exactly depth 2 — `>= 2` would fold depth-3+ in here and make the
			// Sub-sector / Sub-sub-sector lists overlap (BUG-005/013).
			subSubs: sectorList.filter((s) => depthOf(s) === 2),
			expand,
			audienceOf: (slug: string) => audienceBySlug.get(slug) ?? null,
		};
	}, [sectorList]);
}

/**
 * Merge pillar / sub-sector / sub-sub-sector selections and expand each to its
 * descendants, returning a de-duplicated, comma-joined `sector_slug` value (or
 * `undefined` when nothing is selected). Mirrors the companies page exactly.
 */
export function expandSectorSelection(
	tiers: SectorTiers,
	...selections: Array<string[] | undefined>
): string | undefined {
	const sel = selections.flatMap((s) => s ?? []);
	if (!sel.length) return undefined;
	const expanded = Array.from(new Set(sel.flatMap((s) => tiers.expand(s))));
	return expanded.join(',');
}
