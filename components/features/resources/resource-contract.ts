/**
 * The render contract for Reports and Newsletter cards.
 *
 * `ResourceLibrary` reads this shape and nothing else, so each feed maps its
 * own API rows onto it in its leaf component — Reports from `GET /api/reports`,
 * Newsletter from `GET /api/newsletter/articles`. One library, one card set,
 * shared by every tier; only the actions differ per feed.
 */
export type Access = 'Free' | 'Premium';

export interface Resource {
	/** Stable key — a slug where one exists. */
	id: string;
	title: string;
	desc: string;
	date: string;
	access: Access;
	tags: string[];
	cover?: string | null;
	/** Where "View" goes. External links open in a new tab. */
	href?: string;
	external?: boolean;
	/** Imperative open, for content whose URL has to be minted per request (report PDFs). */
	onView?: () => void;
	/** Present only when the item can be downloaded. */
	onDownload?: () => void;
}
