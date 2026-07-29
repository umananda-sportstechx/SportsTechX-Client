'use client';

import { useState } from 'react';

/**
 * Country flags + brand logos for the Atlas founder workspace. Ported from the
 * legacy ui/atoms Flag/Logo but made self-contained (inline styles, Atlas
 * tokens) — no dependency on the legacy design-system.css `.flag`/`.co-logo`
 * classes. Same free, no-token CDNs as before: flagcdn.com for flags, Google
 * Favicons for logos, with graceful fallbacks so a cell is never empty.
 */

// ── Country maps ────────────────────────────────────────────────────────────
const FLAG_COLORS: Record<string, [string, string, string]> = {
	US: ['#B22234', '#FFF', '#3C3B6E'], CA: ['#FF0000', '#FFF', '#FF0000'],
	GB: ['#012169', '#FFF', '#C8102E'], DE: ['#000', '#DD0000', '#FFCE00'],
	FR: ['#0055A4', '#FFF', '#EF4135'], IT: ['#009246', '#FFF', '#CE2B37'],
	ES: ['#AA151B', '#F1BF00', '#AA151B'], NL: ['#AE1C28', '#FFF', '#21468B'],
	SE: ['#006AA7', '#FECC00', '#006AA7'], PT: ['#006600', '#FF0000', '#FFCC29'],
	CH: ['#D52B1E', '#FFF', '#D52B1E'], BE: ['#000', '#FAE042', '#ED2939'],
	AT: ['#ED2939', '#FFF', '#ED2939'], PL: ['#FFF', '#DC143C', '#FFF'],
	IN: ['#FF9933', '#FFF', '#138808'], CN: ['#DE2910', '#FFDE00', '#DE2910'],
	JP: ['#FFF', '#BC002D', '#FFF'], KR: ['#FFF', '#003478', '#CD2E3A'],
	SG: ['#EF3340', '#FFF', '#EF3340'], AU: ['#012169', '#FFF', '#E4002B'],
	NZ: ['#012169', '#FFF', '#CC142B'], BR: ['#009C3B', '#FFDF00', '#002776'],
	AR: ['#74ACDF', '#FFF', '#74ACDF'], MX: ['#006847', '#FFF', '#CE1126'],
	SA: ['#006C35', '#FFF', '#006C35'], AE: ['#00732F', '#FFF', '#FF0000'],
	EG: ['#CE1126', '#FFF', '#000'], ZA: ['#007749', '#FFF', '#DE3831'],
	KE: ['#000', '#BB0000', '#006600'], BA: ['#002F6C', '#FFCC29', '#002F6C'],
	HK: ['#DE2408', '#FFF', '#DE2408'], LU: ['#ED2939', '#FFF', '#00A1DE'],
	AD: ['#10069F', '#FFCD00', '#D50032'], KW: ['#007A3D', '#FFF', '#CE1126'],
};

const CC_TO_COUNTRY: Record<string, string> = {
	US: 'United States', CA: 'Canada', GB: 'United Kingdom', DE: 'Germany',
	FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands', SE: 'Sweden',
	PT: 'Portugal', CH: 'Switzerland', BE: 'Belgium', AT: 'Austria',
	PL: 'Poland', IN: 'India', CN: 'China', JP: 'Japan', KR: 'South Korea',
	SG: 'Singapore', AU: 'Australia', NZ: 'New Zealand', BR: 'Brazil',
	AR: 'Argentina', MX: 'Mexico', SA: 'Saudi Arabia', AE: 'United Arab Emirates',
	EG: 'Egypt', ZA: 'South Africa', KE: 'Kenya', BA: 'Bosnia and Herzegovina',
	HK: 'Hong Kong', LU: 'Luxembourg', AD: 'Andorra', KW: 'Kuwait',
	IL: 'Israel', IE: 'Ireland', FI: 'Finland', NO: 'Norway', DK: 'Denmark',
	ID: 'Indonesia', VN: 'Vietnam', TH: 'Thailand', MY: 'Malaysia',
	PH: 'Philippines', TR: 'Turkey', GR: 'Greece', CZ: 'Czechia',
	HU: 'Hungary', RO: 'Romania', UA: 'Ukraine', RU: 'Russia',
	CL: 'Chile', CO: 'Colombia', PE: 'Peru', NG: 'Nigeria', GH: 'Ghana',
	MA: 'Morocco', QA: 'Qatar', BH: 'Bahrain', OM: 'Oman', JO: 'Jordan',
	PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka',
	MT: 'Malta', CY: 'Cyprus', EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania',
	SI: 'Slovenia', SK: 'Slovakia', HR: 'Croatia', BG: 'Bulgaria', RS: 'Serbia',
	IS: 'Iceland', LI: 'Liechtenstein', MC: 'Monaco', EC: 'Ecuador', UY: 'Uruguay', CR: 'Costa Rica',
};

const COUNTRY_TO_ISO: Record<string, string> = {
	...Object.fromEntries(Object.entries(CC_TO_COUNTRY).map(([code, n]) => [n.toLowerCase(), code])),
	usa: 'US', 'u.s.': 'US', 'u.s.a.': 'US', 'united states of america': 'US',
	uk: 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
	uae: 'AE', 'the netherlands': 'NL', holland: 'NL', 'czech republic': 'CZ',
	'south korea': 'KR', korea: 'KR', 'republic of korea': 'KR', russia: 'RU',
	'viet nam': 'VN', 'hong kong': 'HK', 'türkiye': 'TR', turkiye: 'TR',
};

/** Resolve an ISO-2 code from either a 2-letter code or a country name. '' if unknown. */
export function countryToIso(input?: string | null): string {
	if (!input) return '';
	const s = input.trim();
	if (!s) return '';
	if (s.length === 2) {
		const up = s.toUpperCase();
		return up === 'UK' ? 'GB' : up; // common non-ISO code flagcdn rejects
	}
	return COUNTRY_TO_ISO[s.toLowerCase()] ?? '';
}

/** Pull a bare hostname from a website URL (drops protocol, path, www). */
function extractDomain(website: string | null | undefined): string | null {
	if (!website) return null;
	let s = website.trim();
	if (!s) return null;
	s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
	const host = s.split(/[/?#]/)[0]?.trim();
	if (!host || !host.includes('.')) return null;
	return host.toLowerCase();
}

// ── Flag ────────────────────────────────────────────────────────────────────
/** Real country flag (flagcdn.com SVG) from an ISO-2 code or a country name.
 *  Degrades to a 3-stripe gradient if the image fails, so a flag cell is never
 *  empty. Renders nothing if the country is unknown/empty. */
export function Flag({ cc, size = 18, name }: { cc?: string | null; size?: number; name?: string }) {
	const iso = countryToIso(cc);
	const [failed, setFailed] = useState(false);
	if (!iso) return null;
	const code = iso.toLowerCase();
	const label = name ?? CC_TO_COUNTRY[iso] ?? cc ?? '';
	const colors = FLAG_COLORS[iso] ?? ['#888', '#bbb', '#888'];
	return (
		<span
			title={label}
			aria-label={label}
			role="img"
			style={{
				width: size, height: size * 0.7, display: 'inline-block', verticalAlign: 'middle',
				overflow: 'hidden', borderRadius: 2, flexShrink: 0,
				background: `linear-gradient(180deg, ${colors[0]} 0 33%, ${colors[1]} 33% 66%, ${colors[2]} 66%)`,
			}}
		>
			{!failed && (
				/* eslint-disable-next-line @next/next/no-img-element */
				<img
					src={`https://flagcdn.com/${code}.svg`}
					alt=""
					width={size}
					height={size * 0.7}
					loading="lazy"
					onError={() => setFailed(true)}
					style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
				/>
			)}
		</span>
	);
}

// ── Logo ────────────────────────────────────────────────────────────────────
interface LogoEntity {
	name?: string | null;
	/** Curated logo URL stored on the record (best source). */
	custom_logo_url?: string | null;
	/** Website — used to derive the Google-favicons fallback. */
	website?: string | null;
	/** Short initials/emoji override for the fallback block. */
	logo?: string | null;
}

/**
 * Brand logo with graceful fallback: custom_logo_url → Google Favicons (by
 * website domain) → coloured initials block. The `<img>` onError walks to the
 * next source. Fully self-contained (Atlas tokens), rounded like the mock-ups.
 */
export function Logo({ co, size = 36, radius = 8 }: { co: LogoEntity; size?: number; radius?: number }) {
	const sources: string[] = [];
	if (co.custom_logo_url) sources.push(co.custom_logo_url);
	const domain = extractDomain(co.website);
	if (domain) sources.push(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);

	const [srcIdx, setSrcIdx] = useState(0);
	const src = sources[srcIdx];

	const box: React.CSSProperties = {
		width: size, height: size, borderRadius: radius, flexShrink: 0,
		display: 'grid', placeItems: 'center', overflow: 'hidden',
		border: '1px solid var(--a-border)', background: 'var(--a-surface)',
	};

	if (src) {
		return (
			<div style={box}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={src}
					alt={co.name ? `${co.name} logo` : 'logo'}
					width={size}
					height={size}
					loading="lazy"
					onError={() => setSrcIdx((i) => i + 1)}
					style={{ width: '100%', height: '100%', objectFit: 'contain' }}
				/>
			</div>
		);
	}

	return (
		<div style={{ ...box, background: 'var(--a-inset)', color: 'var(--a-muted)', fontWeight: 600, fontSize: size * 0.34 }}>
			{co.logo ?? co.name?.slice(0, 2).toUpperCase() ?? '—'}
		</div>
	);
}
