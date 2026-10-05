/**
 * Deck-score rating bands → label + colours, shared by the pitch summary and
 * the full-analysis page. Hues come from the Atlas chart palette; the tinted
 * background and ink are mixed from them so both themes read correctly.
 */
export interface ScoreTone { label: string; ring: string; bg: string; fg: string }

function tone(label: string, hue: string): ScoreTone {
	return {
		label,
		ring: hue,
		bg: `color-mix(in srgb, ${hue} 12%, transparent)`,
		fg: `color-mix(in srgb, ${hue} 72%, var(--a-ink))`,
	};
}

export function rating(score: number): ScoreTone {
	if (score < 50) return tone('Early Stage', '#F32163');
	if (score < 70) return tone('Developing', '#D6793A');
	if (score < 83) return tone('Investor Ready', '#006AB2');
	if (score < 93) return tone('Strong', '#4EBC8B');
	return tone('Exceptional', '#0FB86A');
}
