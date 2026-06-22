/**
 * Brand — the SportsTechX wordmark/logo from /public.
 *
 * Renders both the black and white PNGs and lets CSS show the right one for the
 * active theme (next-themes sets `data-theme` on <html>; see the .brand-black /
 * .brand-white rules in globals.css). `horizontal` for wide surfaces (login,
 * expanded sidebar), `mark` for the square collapsed rail mark.
 */
export function Brand({
	variant = 'horizontal',
	height = 28,
	className,
}: {
	variant?: 'horizontal' | 'mark';
	height?: number;
	className?: string;
}) {
	const black = variant === 'horizontal' ? '/stx_black_horizontal.png' : '/stx_black.png';
	const white = variant === 'horizontal' ? '/stx_white_horizontal.png' : '/stx_white.png';
	// NOTE: don't set `display` inline — the .brand-black/.brand-white CSS rules
	// (keyed on data-theme) must control visibility, and inline styles would win.
	const style = { height, width: 'auto' as const };
	return (
		<span className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={black} alt="SportsTechX" className="brand-black" style={style} />
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={white} alt="SportsTechX" className="brand-white" style={style} />
		</span>
	);
}
