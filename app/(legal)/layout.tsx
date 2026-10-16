import { lpDisplay, lpMono, lpSerif } from '../fonts';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingFooter } from '@/components/landing/landing-footer';
import { MobileMenuPanel, MobileMenuProvider, MobileMenuShell } from '@/components/landing/mobile-menu';
import '@/components/landing/landing.css';

/**
 * Shell for the standalone text pages, so they read as part of the Atlas
 * landing page rather than as part of the app.
 *
 * Everything here mirrors `app/page.tsx`: the landing CSS is imported (it is
 * not in the root layout), the shared landing fonts come from `app/fonts.ts`
 * (declared once so Turbopack doesn't choke on duplicate font queries), and the
 * `lp` class is mandatory, since every token in landing.css hangs off it.
 *
 * Space Grotesk (--lp-ui) and Inter (--lp-body) come from the root layout and
 * cascade down. Azeret Mono is skipped too, as these pages render no .lp-btn.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className={`lp lp-solid-nav ${lpDisplay.variable} ${lpMono.variable} ${lpSerif.variable}`}>
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
