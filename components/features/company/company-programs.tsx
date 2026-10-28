'use client';

import useSWR from 'swr';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from '@/components/atlas';
import { qk } from '@/lib/query-keys';

interface Participation {
	id: string; program_entity_id: string; cohort_year: number | null;
	participation_status: 'applied' | 'accepted' | 'graduated' | 'dropped';
	program_name?: string; program_website?: string | null;
}

const extUrl = (u: string | null | undefined) => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : undefined);

/**
 * Programs (accelerators, incubators, event competitions…) the company took
 * part in, from program_participations — including ones a verified claimant added. One row per
 * program (the data has duplicates; the row with a year wins), linking to the
 * program's site as the Programs list does. Hidden when there are none.
 */
export function CompanyPrograms({ companyId }: { companyId: string }) {
	const { data } = useSWR<{ data: Participation[] }>(qk.ecosystem.participations({ company_id: companyId, limit: 50 }));
	const seen = new Set<string>();
	// Newest year first (server order); applied / dropped aren't participation.
	const rows = (data?.data ?? []).filter((p) => (p.participation_status === 'accepted' || p.participation_status === 'graduated')
		&& p.program_name && !seen.has(p.program_entity_id) && seen.add(p.program_entity_id));
	if (rows.length === 0) return null;

	return (
		<section className="atlas-card atlas-co__side">
			<h2 className="atlas-co__h">Programs</h2>
			<p className="atlas-co__sub">Accelerators, programs and events it took part in</p>
			{rows.map((p) => {
				const href = extUrl(p.program_website);
				const meta = [p.cohort_year, p.participation_status === 'graduated' ? 'Graduated' : null].filter(Boolean).join(' · ');
				const body = (
					<>
						<span className="atlas-co__prog">
							<Logo co={{ name: p.program_name!, website: p.program_website ?? null }} size={28} radius={5} />
							<span className="atlas-co__prog-text">
								<span className="atlas-co__rel-name">{p.program_name}</span>
								{meta && <span className="atlas-co__rel-meta">{meta}</span>}
							</span>
						</span>
						{href && <span className="atlas-co__rel-go" aria-hidden="true"><ArrowUpRight size={12} /></span>}
					</>
				);
				return href
					? <a key={p.id} href={href} target="_blank" rel="noopener noreferrer" className="atlas-co__rel">{body}</a>
					: <div key={p.id} className="atlas-co__rel">{body}</div>;
			})}
		</section>
	);
}
