'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/atlas';
import { ExportModal } from './export-modal';

/**
 * The Export affordance for a catalog list.
 *
 * Every list already builds a `params` memo for its SWR key, so this takes that
 * object and strips what the export must not inherit: pagination (the export
 * has its own row cap), sort (the server orders deterministically), and `q`
 * (passed separately, because the server searches rather than filters on it).
 *
 * One component rather than a button plus state plus a conditionally mounted
 * modal in five list files.
 */
const OMIT = new Set(['page', 'limit', 'sort', 'q']);

export function ExportButton({ entity, search, params }: {
	entity: string;
	/** The list's live (debounced) search term. */
	search?: string | null;
	/** The list's SWR params — filters are taken from here. */
	params: Record<string, unknown>;
}) {
	const [open, setOpen] = useState(false);
	const filters = useMemo(
		() => Object.fromEntries(Object.entries(params).filter(([k]) => !OMIT.has(k))),
		[params],
	);
	return (
		<>
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}><Download size={13} /> Export</Button>
			{open && (
				<ExportModal entity={entity} search={search?.trim() || null} filters={filters} onClose={() => setOpen(false)} />
			)}
		</>
	);
}
