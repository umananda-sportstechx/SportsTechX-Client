import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/legal-document';
import { privacyPolicy } from '@/components/landing/legal';

export const metadata: Metadata = {
	// Bare title: the root layout supplies the ' | Atlas' template. It used to
	// carry the brand itself, which rendered as '... — SportsTechX | SportsTechX'.
	title: 'Privacy Policy',
	description: 'How SportsTechX GmbH collects, uses and protects your personal data.',
	alternates: { canonical: '/privacy-policy' },
	openGraph: {
		title: 'Privacy Policy | Atlas',
		description: 'How SportsTechX GmbH collects, uses and protects your personal data.',
		url: '/privacy-policy',
	},
};

export default function PrivacyPolicyPage() {
	return <LegalDocument doc={privacyPolicy} />;
}
