import { Anton, Newsreader, Space_Mono } from 'next/font/google';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingFooter } from '@/components/landing/landing-footer';
import { MobileMenuPanel, MobileMenuProvider, MobileMenuShell } from '@/components/landing/mobile-menu';
import '@/components/landing/landing.css';

/**
 * Shell for the standalone text pages, so they read as part of the Atlas
 * landing page rather than as part of the app.
 *
 * Everything here mirrors `app/page.tsx`: the landing CSS is imported (it is
 * not in the root layout), the fonts are re-declared because a `next/font`
 * loader has to be called at module scope in the file that uses it — calling it
 * again with identical options is deduped by the build — and the `lp` class is
 * mandatory, since every token in landing.css hangs off it.
 *
 * Space Grotesk (--lp-ui) and Inter (--lp-body) are NOT re-declared: they come
 * from the root layout and cascade down. Azeret Mono is skipped too, as these
 * pages render no .lp-btn.
 */
const display = Anton({ weight: '400', subsets: ['latin'], variable: '--lp-display', display: 'swap' });
const mono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--lp-mono', display: 'swap' });
const serif = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--lp-serif-fb', display: 'swap' });

export default function LegalLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className={`lp lp-solid-nav ${display.variable} ${mono.variable} ${serif.variable}`}>
			{/* Same ordering as the landing page: the panel is a SIBLING before the
			    shell, because the shell is transformed while the drawer is out. */}
			<MobileMenuProvider>
				<MobileMenuPanel />
				<MobileMenuShell nav={<LandingNav />}>
					<main>{children}</main>
					<LandingFooter />
				</MobileMenuShell>
			</MobileMenuProvider>
		</div>
	);
}
