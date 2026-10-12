/**
 * The verified badge — a filled-blue scalloped disc with a white check inside.
 *
 * lucide's `BadgeCheck` is stroke-only, so the badge read as an outline rather
 * than the solid blue mark people recognise as "verified". This fills the disc
 * and knocks the check out of it, like the ticks on the platforms the gesture
 * borrows from.
 */
export function VerifiedBadge({ size = 16, className }: { size?: number; className?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			aria-hidden="true"
			focusable="false"
		>
			{/* Scalloped disc, filled with the brand blue. */}
			<path
				fill="var(--a-blue)"
				d="M12 1.5l2.47 1.92 3.11-.3 1.1 2.93 2.72 1.55-.86 3.01.86 3.01-2.72 1.55-1.1 2.93-3.11-.3L12 22.5l-2.47-1.92-3.11.3-1.1-2.93-2.72-1.55.86-3.01-.86-3.01 2.72-1.55 1.1-2.93 3.11.3L12 1.5z"
			/>
			{/* Check knocked out in white (transparent to the blue beneath). */}
			<path
				d="M8.2 12.1l2.5 2.5 5.1-5.2"
				stroke="#ffffff"
				strokeWidth="2.1"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</svg>
	);
}
