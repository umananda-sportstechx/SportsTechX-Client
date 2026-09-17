import { Anton, Azeret_Mono, Newsreader, Space_Mono } from 'next/font/google';
import { LandingNav } from '@/components/landing/landing-nav';
import { IntroHero } from '@/components/landing/intro-hero';
import { TrustedBy } from '@/components/landing/trusted-by';
import { HowToJoin } from '@/components/landing/how-to-join';
import { ProductGallery } from '@/components/landing/product-gallery';
import { Testimonials } from '@/components/landing/testimonials';
import { Team } from '@/components/landing/team';
import { Faq } from '@/components/landing/faq';
import { FinalHero } from '@/components/landing/final-hero';
import { LandingFooter } from '@/components/landing/landing-footer';
import { MobileMenuPanel, MobileMenuProvider, MobileMenuShell } from '@/components/landing/mobile-menu';
import { siteContent } from '@/lib/site-content';
import '@/components/landing/landing.css';

/**
 * Public marketing landing page (Atlas – Landing V2, from Figma). Fixed-theme (its own palette in landing.css, scoped to
 * `.lp`), independent of the app's light/dark toggle. This replaces the old
 * `redirect('/raise')`; `/` is whitelisted in lib/supabase/middleware.ts so it's
 * reachable while logged out.
 *
 * Fonts: headings use the design's licensed "Zuume" as soon as its file exists at
 * public/fonts/zuume-regular.woff2 (see the @font-face in landing.css); until then
 * they fall through to Anton, the closest free match. Eyebrows/buttons/nav use
 * Azeret Mono (exact, from the design); body reuses the app's Inter.
 */
const display = Anton({ weight: '400', subsets: ['latin'], variable: '--lp-display', display: 'swap' });
/* Space Mono is the design's mono for eyebrows, switchers and roles. Azeret Mono
   is NOT a substitute for it — the design uses Azeret in exactly one place, the
   intro-hero CTAs, so it keeps its own variable. */
const mono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--lp-mono', display: 'swap' });
const monoCta = Azeret_Mono({ subsets: ['latin'], variable: '--lp-mono-cta', display: 'swap' });
/* Fallback behind Kepler Std until it is added to the Adobe kit (see landing.css). */
const serif = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--lp-serif-fb', display: 'swap' });

/* Placeholder copy, reproduced from the design as-is. */
const GALLERY_DESC =
	'Sed diam nonumy eirmod tempor invidunt ut labore. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor';

export default async function LandingPage() {
	/* Carousel, team, dashboard screenshots and testimonials come from the admin
	   panel's Site assets page. Every section falls back to the placeholders the
	   components ship with, so a slow or dead API renders the page unchanged. */
	const cms = await siteContent();

	return (
		<div className={`lp ${display.variable} ${mono.variable} ${monoCta.variable} ${serif.variable}`}>
			{/* The panel is a SIBLING before the shell, not a child: the shell is
			    transformed while the drawer is out, so a panel inside it would
			    slide along with the page instead of being revealed by it. The nav
			    is passed as a prop rather than as a child so it stays crisp while
			    the page behind it dims. */}
			<MobileMenuProvider>
				<MobileMenuPanel />
				<MobileMenuShell nav={<LandingNav />}>
			<main>
				<IntroHero />
				<TrustedBy items={cms.gallery} />
				<HowToJoin />
				<section className="lp-gallery-wrap" id="explore">
					<ProductGallery title="Inside Atlas" accent="Explore" desc={GALLERY_DESC} variant="a" shots={cms.dashboard} />
					<div className="lp-gallery-divider" />
					<ProductGallery title="Inside Atlas" accent="Explore" desc={GALLERY_DESC} variant="b" shots={cms.dashboard} />
					<div className="lp-gallery-divider" />
					<ProductGallery title="Inside Atlas" accent="Explore" desc={GALLERY_DESC} variant="c" shots={cms.dashboard} />
				</section>
				<Testimonials items={cms.testimonials} />
				<Team items={cms.team} />
				<Faq />
				<FinalHero />
			</main>
			<LandingFooter />
				</MobileMenuShell>
			</MobileMenuProvider>
		</div>
	);
}
