/**
 * Provider brand logo, shared by the docs integrations pages and the in-app
 * /integrations page. Renders a local SVG from /public/logos/<id>.svg when we have
 * one, else a branded initial tile (used for providers whose official mark isn't
 * available yet — drop a /public/logos/<id>.svg in and add the id to HAS_LOGO).
 */
const HAS_LOGO = new Set(['google-sheets', 'salesforce', 'hubspot', 'intercom']);

const BRAND: Record<string, string> = {
	attio: '#266DF0',
	hubspot: '#FF7A59',
	salesforce: '#00A1E0',
	'google-sheets': '#0F9D58',
	intercom: '#1F8DED',
};

/** Normalise provider ids from either source: `google_sheets` and `google-sheets`
 *  both map to the `google-sheets` asset/brand key. */
const norm = (id: string) => id.toLowerCase().replace(/_/g, '-');

export function BrandLogo({ id, label, brand, size = 44 }: { id: string; label: string; brand?: string; size?: number }) {
	const key = norm(id);
	if (HAS_LOGO.has(key)) {
		const inner = Math.round(size * 0.6);
		return (
			<span
				aria-hidden
				className="inline-grid place-items-center rounded-2xl bg-white shrink-0 ring-1 ring-black/6"
				style={{ width: size, height: size }}
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={`/logos/${key}.svg`} alt={`${label} logo`} width={inner} height={inner} style={{ width: inner, height: inner, objectFit: 'contain' }} />
			</span>
		);
	}
	const color = brand ?? BRAND[key] ?? '#5b6474';
	return (
		<span
			aria-hidden
			className="inline-grid place-items-center rounded-2xl font-bold text-white shrink-0"
			style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(140deg, ${color}, ${color}cc)`, boxShadow: `0 8px 22px -10px ${color}90` }}
		>
			{label.charAt(0).toUpperCase()}
		</span>
	);
}
