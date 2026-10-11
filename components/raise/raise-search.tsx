/** Raise's agent composer is the shared Atlas AgentComposer; these are Raise's suggestions. */
export { AgentComposer as RaiseSearch } from '@/components/atlas';

export const RAISE_SUGGESTIONS = [
	'Find investors for my round',
	"How's my pipeline looking?",
	'Review my pitch deck',
	'Size my market',
];

/** Explore's prompts — market questions, since a free account has no workspace.
 *  Kept in step with the chips on the Explore home composer. */
export const EXPLORE_SUGGESTIONS = [
	'Who is funding fan engagement right now?',
	'Summarise last month’s funding rounds',
	'Which sports tech events are coming up?',
	'How is the sports tech market structured?',
];

/** The investor equivalent, for the Scout view of the same chat page. Kept in
 *  step with `ScoutHomeService.PROMPTS`, which seeds the Scout home composer. */
export const SCOUT_SUGGESTIONS = [
	'Find companies matching my thesis',
	'Show recent sports tech deals',
	"What's new in fan engagement?",
	'Find European Series A companies',
];
