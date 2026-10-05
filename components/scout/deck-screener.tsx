import type { DeckSummaryCopy } from '@/components/features/deck-analysis/deck-summary';
import type { DeckDetailCopy } from '@/components/features/deck-analysis/deck-analysis-detail';

/**
 * Deck Screener copy — Scout runs the same deck analysis as Raise's Pitch Deck
 * (upload → /api/deck-analysis → stream); only the framing is investor-side.
 */
const OUTPUT = ['Overall score and verdict', 'Scores by topic', 'Area-by-area detail', 'Strengths', 'Diligence flags'];

export const SCREENER_COPY: DeckSummaryCopy = {
	emptyTitle: 'Screen a pitch deck with Atlas',
	emptyBody: 'Upload a startup’s pitch deck and Atlas will score it area by area, flag what’s missing or unproven, and list the concerns to dig into before you take a meeting.',
	emptyCta: 'Screen a pitch deck',
	fallbackName: 'Pitch deck',
	emptyExtra: (
		<div className="scout-screener-out">
			<div className="atlas-eyebrow">What you’ll get</div>
			<ol>{OUTPUT.map((o, i) => <li key={o}><span>{String(i + 1).padStart(2, '0')}</span>{o}</li>)}</ol>
		</div>
	),
};

export const SCREENER_DETAIL_COPY: DeckDetailCopy = {
	back: 'Back to Deck Screener', fallbackName: 'Pitch deck',
	recommendations: 'Gaps to probe', strengths: 'Strengths', concerns: 'Diligence flags',
};
