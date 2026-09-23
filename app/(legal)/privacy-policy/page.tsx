import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/legal-document';
import { privacyPolicy } from '@/components/landing/legal';

export const metadata: Metadata = {
	title: 'Privacy Policy — SportsTechX',
	description: 'How SportsTechX GmbH collects, uses and protects your personal data.',
};

export default function PrivacyPolicyPage() {
	return <LegalDocument doc={privacyPolicy} />;
}
