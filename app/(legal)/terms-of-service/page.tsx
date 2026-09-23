import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/legal-document';
import { termsOfService } from '@/components/landing/legal';

export const metadata: Metadata = {
	title: 'Terms of Service — SportsTechX',
	description: 'The terms governing your access to and use of the SportsTechX Intelligence Platform.',
};

export default function TermsOfServicePage() {
	return <LegalDocument doc={termsOfService} />;
}
