import { lpDisplay, lpMono, lpMonoCta, lpSerif } from './fonts';
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
 * a redirect into the Raise workspace; the signed-in product now lives at `/app`, and `/` is whitelisted in lib/supabase/middleware.ts so it's
 * reachable while logged out.
 *
 * Fonts: headings use the design's licensed "Zuume" as soon as its file exists at
 * public/fonts/zuume-regular.woff2 (see the @font-face in landing.css); until then
 * they fall through to Anton, the closest free match. Eyebrows/buttons/nav use
 * Azeret Mono (exact, from the design); body reuses the app's Inter.
 */
/* "Inside Atlas" gallery blurbs, from the spec (#5 Explore, #6 Raise, #7 Scout). */
const DASH_EXPLORE_DESC = 'Map the sports tech market, research companies and investors, and access industry reports, programs and events.';
const DASH_RAISE_DESC = 'Find the right investors, benchmark your company and sharpen your pitch with the SportsTechX intelligence layer.';
const DASH_SCOUT_DESC = 'Source deals matched to your thesis and strengthen due diligence with sports tech market data and analysis.';

export default async function LandingPage() {
	/* Carousel, team, dashboard screenshots and testimonials come from the admin
	   panel's Site assets page. Every section falls back to the placeholders the
	   components ship with, so a slow or dead API renders the page unchanged. */
	const cms = await siteContent();

	return (
		<div className={`lp ${lpDisplay.variable} ${lpMono.variable} ${lpMonoCta.variable} ${lpSerif.variable}`}>
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
				{/* The three product dashboards. The ids are the scroll targets for
				    the tier cards' "View the … dashboard" links in HowToJoin. */}
				<section className="lp-gallery-wrap" id="explore">
					<ProductGallery id="dash-explore" title="Inside Atlas" accent="Explore" desc={DASH_EXPLORE_DESC} variant="a" shots={cms.dashboard} />
					<div className="lp-gallery-divider" />
					<ProductGallery id="dash-raise" title="Inside Atlas" accent="Raise" desc={DASH_RAISE_DESC} variant="b" shots={cms.dashboard_raise} />
					<div className="lp-gallery-divider" />
					<ProductGallery id="dash-scout" title="Inside Atlas" accent="Scout" desc={DASH_SCOUT_DESC} variant="c" shots={cms.dashboard_scout} />
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
