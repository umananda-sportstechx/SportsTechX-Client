import Link from 'next/link';

export const metadata = {
	title: 'Terms of Service — SportsTechX',
	description: 'The agreement between you and SportsTechX when using our platform.',
};

const LAST_UPDATED = '2026-05-08';

export default function TermsOfServicePage() {
	return (
		<main className="min-h-screen bg-background py-12 px-4">
			<article className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
				<header className="not-prose mb-8">
					<Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
					<h1 className="text-3xl font-bold mt-4 mb-2">Terms of Service</h1>
					<p className="text-sm text-muted-foreground">
						Last updated: {LAST_UPDATED}. This is v1 — under review by counsel.
					</p>
				</header>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Acceptance of Terms</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						By creating an account or using the SportsTechX platform you agree to these terms. If you don't
						agree, don't use the service.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Your Account</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						You are responsible for keeping your login credentials secure and for all activity on your
						account. Tell us immediately if you suspect unauthorized access.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Acceptable Use</h2>
					<ul className="text-sm leading-relaxed text-muted-foreground space-y-2 list-disc pl-5">
						<li>Don't scrape, bulk-download, or redistribute our data without a written license</li>
						<li>Don't reverse-engineer, decompile, or attempt to bypass our security controls</li>
						<li>Don't use the platform to harass, defame, or impersonate any person or company</li>
						<li>Don't use AI features to generate content that violates Anthropic's or OpenAI's usage policies</li>
						<li>Respect rate limits on the API; we may suspend abusive keys without notice</li>
					</ul>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Subscriptions and Billing</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						Paid plans are billed monthly or annually via Stripe. Cancellation takes effect at the end of
						the current billing period; we don't issue partial-month refunds. We reserve the right to
						change pricing on 30 days' written notice via email.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Data Accuracy</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						We work hard to keep our company, investor, and deal data accurate, but we make no warranty.
						You should independently verify critical facts before acting on them. If you spot an error,
						use the Data Change Request feature in the app and we'll review.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Limitation of Liability</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						SportsTechX is provided "as is." We are not liable for indirect, incidental, or consequential
						damages arising from your use of the platform. Our total liability for any claim will not
						exceed the amount you paid us in the 12 months preceding the claim.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Termination</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						You can close your account anytime from Settings. We can terminate accounts that violate these
						terms with reasonable notice (immediately for severe violations).
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Governing Law</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						These terms are governed by the laws of England and Wales. Disputes will be resolved in the
						courts of London.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Contact</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						SportsTechX Ltd · legal@sportstechx.com
					</p>
				</section>
			</article>
		</main>
	);
}
