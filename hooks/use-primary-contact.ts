'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useFeatureAccess } from '@/contexts/feature-access-context';

export interface PrimaryContactData {
	id: string;
	full_name: string | null;
	job_position: string | null;
	email: string | null;
	linkedin_url: string | null;
	phone: string | null;
	role: string | null;
}

/**
 * A company's primary contact, Pro-gated via the `company_contacts` feature.
 * Shared by the drawer and the full profile so both gate identically; the
 * contact is only fetched once the viewer is entitled (it's PII).
 */
export function usePrimaryContact(companyId: string) {
	const access = useFeatureAccess('company_contacts');
	const entitled = !access.isLoading && !access.isLocked;
	const { data: contact, isLoading } = useSWR<PrimaryContactData | null>(entitled ? qk.companies.contacts(companyId) : null);
	return { access, contact: contact ?? null, isLoading: access.isLoading || (entitled && isLoading) };
}
