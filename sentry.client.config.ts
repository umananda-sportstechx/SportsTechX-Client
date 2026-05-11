/**
 * Sentry browser config. Lazy-loads `@sentry/nextjs` only when the env var is
 * set so dev builds without a DSN don't pay the bundle cost. To wire this up
 * properly:
 *   1. `npm i @sentry/nextjs` in the client
 *   2. Run `npx @sentry/wizard@latest -i nextjs` (or copy your DSN into
 *      NEXT_PUBLIC_SENTRY_DSN)
 *   3. Uncomment the dynamic import below
 *
 * The shape stays stable so consumers can `import './sentry.client.config'`
 * from `app/layout.tsx` without churn when the package lands.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
	// Loaded dynamically so a missing `@sentry/nextjs` install doesn't break the
	// build. Install it (`npm i @sentry/nextjs`) to activate.
	const sentryPkg = '@sentry/nextjs';
	void (async () => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const Sentry = (await import(/* webpackIgnore: true */ sentryPkg)) as any;
			Sentry.init({
				dsn,
				tracesSampleRate: 0.1,
				replaysSessionSampleRate: 0.0,
				replaysOnErrorSampleRate: 1.0,
				environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
			});
		} catch {
			// @sentry/nextjs not installed — fail silently
		}
	})();
}

export {};
