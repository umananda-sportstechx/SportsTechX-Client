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
			{/* Symmetric rounded-scallop seal (Heroicons solid check-badge), brand blue. */}
			<path
				fill="var(--a-blue)"
				d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Z"
			/>
			{/* White check laid over the seal, centred on 12,12. */}
			<path
				d="M8.4 12.3l2.5 2.5 4.7-5.4"
				stroke="#ffffff"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</svg>
	);
}
