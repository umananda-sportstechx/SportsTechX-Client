/** Raise's agent composer is the shared Atlas AgentComposer; these are Raise's suggestions. */
export { AgentComposer as RaiseSearch } from '@/components/atlas';

export const RAISE_SUGGESTIONS = [
	'Find investors for my round',
	"How's my pipeline looking?",
	'Review my pitch deck',
	'Size my market',
];

/** The investor equivalent, for the Scout view of the same chat page. Kept in
 *  step with `ScoutHomeService.PROMPTS`, which seeds the Scout home composer. */
export const SCOUT_SUGGESTIONS = [
	'Find companies matching my thesis',
	'Show recent sports tech deals',
	"What's new in fan engagement?",
	'Find European Series A companies',
];
