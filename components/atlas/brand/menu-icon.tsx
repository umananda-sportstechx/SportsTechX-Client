/** Figma "Menu Trigger" glyph: two full lines over a shorter right-aligned one (1.5px stroke). */
export function MenuIcon({ size = 24 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
			<path d="M3.5 7h17M3.5 12.5h17M12 18h8.5" />
		</svg>
	);
}
