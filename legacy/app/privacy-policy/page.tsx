import Link from 'next/link';

export const metadata = {
	title: 'Privacy Policy — SportsTechX',
	description: 'How SportsTechX collects, uses, and protects your data.',
};

const LAST_UPDATED = '2026-05-08';

export default function PrivacyPolicyPage() {
	return (
		<main className="min-h-screen bg-background py-12 px-4">
			<article className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
				<header className="not-prose mb-8">
					<Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
					<h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
					<p className="text-sm text-muted-foreground">
						Last updated: {LAST_UPDATED}. This is v1 — under review by counsel.
					</p>
				</header>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Information We Collect</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						When you sign up for SportsTechX we collect: your email address, full name, optional company
						name, optional job title, and country. We collect usage analytics — pages viewed, searches
						performed, features used — to improve the product. We do not sell this data.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">How We Use It</h2>
					<ul className="text-sm leading-relaxed text-muted-foreground space-y-2 list-disc pl-5">
						<li>To authenticate you and serve personalized content (saved searches, watchlists, recommendations)</li>
						<li>To process subscription payments via Stripe (your card details never touch our servers)</li>
						<li>To send transactional emails (welcome, claim approvals, verified-report-ready, trial reminders) via Resend</li>
						<li>To improve our AI features through anonymized aggregate usage data</li>
						<li>To prevent fraud and enforce our Terms of Service</li>
					</ul>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Third-Party Processors</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						We rely on a small set of vendors to operate the platform. They process data only to deliver
						their service to us, never independently:
					</p>
					<ul className="text-sm leading-relaxed text-muted-foreground space-y-1 list-disc pl-5 mt-2">
						<li>Supabase — authentication + Postgres database hosting</li>
						<li>Stripe — payment processing</li>
						<li>Resend — transactional email delivery</li>
						<li>Anthropic, OpenAI — AI features (verified reports, chat agent)</li>
						<li>Sentry — error tracking</li>
						<li>Mixpanel — product analytics</li>
						<li>Intercom — customer support chat</li>
					</ul>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Your Rights</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						You can request a copy of your data, ask us to delete it, or correct anything that's wrong.
						Email us at <a href="mailto:privacy@sportstechx.com" className="underline">privacy@sportstechx.com</a> and
						we'll respond within 30 days.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Cookies</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						We use cookies for authentication (your Supabase session) and to remember your UI preferences.
						We do not use third-party advertising cookies.
					</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold mt-8 mb-3">Contact</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						SportsTechX Ltd · privacy@sportstechx.com
					</p>
				</section>
			</article>
		</main>
	);
}
