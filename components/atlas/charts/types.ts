/** Data shapes accepted by the Atlas charts. */

export interface PieSegment {
	name: string;
	v: number;
	color: string;
	label?: string;
}

export interface ComboPoint {
	year?: string | number;
	label?: string;
	amt: number;
	deals: number;
}
