import { Anton, Azeret_Mono, Newsreader, Space_Mono } from 'next/font/google';

/**
 * Landing / legal fonts, declared once and shared.
 *
 * A `next/font` loader must be called at module scope. Calling the same loader
 * from two route files (page.tsx and (legal)/layout.tsx) used to be "deduped by
 * the build", but under Turbopack it corrupts the shared font-query map and the
 * production build fails with "next/font/google queries have exactly one entry"
 * — flaky, surfacing on whichever font module is mid-build. One call each here
 * removes the duplicate queries. CSS variable names must match landing.css.
 */
export const lpDisplay = Anton({ weight: '400', subsets: ['latin'], variable: '--lp-display', display: 'swap' });
export const lpMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--lp-mono', display: 'swap' });
export const lpMonoCta = Azeret_Mono({ subsets: ['latin'], variable: '--lp-mono-cta', display: 'swap' });
export const lpSerif = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--lp-serif-fb', display: 'swap' });
