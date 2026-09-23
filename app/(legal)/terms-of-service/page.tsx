import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/legal-document';
import { termsOfService } from '@/components/landing/legal';

export const metadata: Metadata = {
	// Bare title: the root layout supplies the ' | Atlas' template. It used to
	// carry the brand itself, which rendered as '... — SportsTechX | SportsTechX'.
	title: 'Terms of Service',
	description: 'The terms governing your access to and use of the SportsTechX Intelligence Platform.',
	alternates: { canonical: '/terms-of-service' },
	openGraph: {
		title: 'Terms of Service | Atlas',
		description: 'The terms governing your access to and use of the SportsTechX Intelligence Platform.',
		url: '/terms-of-service',
	},
};

export default function TermsOfServicePage() {
	return <LegalDocument doc={termsOfService} />;
}
