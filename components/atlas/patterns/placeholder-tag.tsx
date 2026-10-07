/** The exact label for screens whose backend isn't built yet. */
export const PLACEHOLDER_LABEL = 'Backend Not Connected (Placeholders)';

/**
 * Pill for screens built to the design but not yet wired to a backend (sample
 * data). Same look as the SOON pill; nav items use the short form via
 * `placeholder: true`. Remove it when the screen is connected.
 */
export function PlaceholderTag({ short }: { short?: boolean }) {
	return <span className="atlas-soon atlas-soon--inline" title={PLACEHOLDER_LABEL}>{short ? 'Not connected' : PLACEHOLDER_LABEL}</span>;
}
