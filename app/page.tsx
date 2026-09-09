import { Anton, Azeret_Mono, Newsreader } from 'next/font/google';
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
import '@/components/landing/landing.css';

/**
 * Public marketing landing page (Atlas – Landing V2, from Figma). UI only — no
 * APIs, no dynamic data. Fixed-theme (its own palette in landing.css, scoped to
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
const mono = Azeret_Mono({ subsets: ['latin'], variable: '--lp-mono', display: 'swap' });
/* Editorial serif used for eyebrows, body copy and the tier-card labels. */
const serif = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--lp-serif', display: 'swap' });

/* Placeholder copy, reproduced from the design as-is. */
const GALLERY_DESC =
	'Sed diam nonumy eirmod tempor invidunt ut labore. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor';

export default function LandingPage() {
	return (
		<div className={`lp ${display.variable} ${mono.variable} ${serif.variable}`}>
			<LandingNav />
			<main>
				<IntroHero />
				<TrustedBy />
				<HowToJoin />
				<section className="lp-gallery-wrap" id="explore">
					<ProductGallery title="Inside Atlas" accent="Explore" desc={GALLERY_DESC} variant="a" />
					<div className="lp-gallery-divider" />
					<ProductGallery title="Inside Atlas" accent="Explore" desc={GALLERY_DESC} variant="b" />
					<div className="lp-gallery-divider" />
					<ProductGallery title="Inside Atlas" accent="Explore" desc={GALLERY_DESC} variant="c" />
				</section>
				<Testimonials />
				<Team />
				<Faq />
				<FinalHero />
			</main>
			<LandingFooter />
		</div>
	);
}
