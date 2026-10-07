/**
 * Editorial copy for the SportsTechX framework. The structure itself (pillars →
 * categories → sub-categories), company counts and example companies come live
 * from the sectors + companies APIs; this file only adds the words around them.
 *
 * Keyed by sector slug (see /api/sectors). Descriptions are from the Atlas
 * Product UX v3 Figma. `technologies` / `useCases` are DRAFT copy — edit freely.
 */

export interface PillarCopy {
	/** Audience badge, e.g. "For athletes". */
	badge: string;
	/** Badge + card-glow colour (Figma "Card Title" fill). */
	color: string;
	/** Tag ink on the tinted sub-category chips. */
	tagInk: string;
}

export interface CategoryCopy {
	description: string;
	technologies: string[];
	useCases: string[];
}

/** Pillars in display order (left → right). */
export const PILLARS: Record<string, PillarCopy> = {
	activity_performance: { badge: 'For athletes', color: '#4C1D95', tagInk: '#210D3F' },
	fans_content: { badge: 'For fans', color: '#1479FF', tagInk: '#103463' },
	management_organisation: { badge: 'For executives', color: '#0FB86A', tagInk: '#14513A' },
};

/** Categories in display order within their pillar. */
export const CATEGORIES: Record<string, CategoryCopy> = {
	activity_performance__for_activity_hardware: {
		description: 'Physical products used in and around sporting activity, from body-worn devices to the equipment and infrastructure that activity happens on.',
		technologies: ['Body-worn sensors', 'Smart apparel and footwear', 'Connected equipment', 'Performance analytics'],
		useCases: ['Load and injury monitoring', 'Tactical analysis', 'Talent identification', 'Broadcast data'],
	},
	activity_performance__for_activity_software: {
		description: 'Software that captures, analyses and teaches during activity, covering both performance analytics and instructional content.',
		technologies: ['Video and performance analysis', 'Tracking data platforms', 'Coaching and training apps', 'Instructional content'],
		useCases: ['Match and video analysis', 'Training planning', 'Remote coaching', 'Skill development'],
	},
	activity_performance__before_after_activity: {
		description: 'Everything that surrounds the activity itself — finding and booking it, recovering from it, staying injury-free and progressing as an athlete.',
		technologies: ['Booking and discovery platforms', 'Recovery and rehab tech', 'Nutrition and health apps', 'Scouting and recruitment platforms'],
		useCases: ['Finding and booking facilities', 'Return-to-play programmes', 'Injury prevention', 'Athlete progression'],
	},
	fans_content__content_platforms: {
		description: 'Platforms that produce and distribute sports content to audiences, from editorial products to live and on-demand streaming.',
		technologies: ['OTT and streaming', 'Sports media and publishing', 'Production and editing tools', 'Automated highlights'],
		useCases: ['Live and on-demand streaming', 'Digital editorial', 'Highlight clipping', 'Content distribution'],
	},
	fans_content__fan_experiences: {
		description: 'Products that turn audiences into participants — engagement platforms, communities, ticketing and fan commerce.',
		technologies: ['Fan engagement platforms', 'Ticketing', 'Loyalty and membership', 'Fan commerce'],
		useCases: ['Matchday apps', 'Fan communities', 'Ticket sales and access', 'Merchandise'],
	},
	fans_content__fantasy_sports_betting: {
		description: 'Prediction-led products and the data and compliance infrastructure that makes regulated betting work.',
		technologies: ['Sportsbook platforms', 'Fantasy games', 'Odds and data feeds', 'Integrity and compliance tools'],
		useCases: ['Daily fantasy', 'In-play betting', 'Integrity monitoring', 'Responsible gambling'],
	},
	management_organisation__organisations_venues: {
		description: 'Software used to run the sporting and commercial operation — teams and clubs, leagues and events, and the venues they play in.',
		technologies: ['Club and league management', 'Event management', 'Smart venue tech', 'Facility operations'],
		useCases: ['Team administration', 'Event operations', 'Venue connectivity', 'Access control'],
	},
	management_organisation__media_sponsors: {
		description: 'The commercial layer around sport: producing content at scale and measuring, selling and activating sponsorship.',
		technologies: ['Content production at scale', 'Sponsorship measurement', 'Advertising tech', 'Rights management'],
		useCases: ['Sponsorship valuation', 'Brand activation', 'Broadcast advertising', 'Rights distribution'],
	},
};

/** Intro paragraph above the pillar cards (Figma). */
export const FRAMEWORK_INTRO = 'The SportsTechX framework organises sports tech by who it serves — athletes, fans and executives — then by category and sub-category. Select a category to see what sits inside it and how it connects to the rest of the market.';
