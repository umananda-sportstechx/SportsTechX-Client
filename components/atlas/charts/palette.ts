/**
 * Chart colour palettes from the Atlas Figma. Mid-tones that read on both the
 * light and dark card surfaces. (Line/tooltip/bar-gradient colours are CSS
 * tokens in styles/tokens.css, as --a-chart-*.)
 */

/** Categorical palette — donut / legend order. */
export const CHART_PALETTE = [
	'#006AB2', '#6C1A8E', '#4EBC8B', '#D6793A',
	'#6CC6E5', '#9196A3', '#1C4C78', '#BE1A4E',
];
/** Progress-bar colours for ranked rows (sector tree): purple, blue, green, then the rest. */
export const BAR_PALETTE = ['#4C1D95', '#155FE7', '#0FB86A', '#F32163', '#D6793A', '#6CC6E5', '#006AB2', '#9196A3'];
/** Accent for single-series bar lists (e.g. business model, geography). */
export const BAR_ACCENT = '#F32163';

export const paletteAt = (i: number) => CHART_PALETTE[i % CHART_PALETTE.length];
export const barAt = (i: number) => BAR_PALETTE[i % BAR_PALETTE.length];
