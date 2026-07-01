'use client';

import { useState, type CSSProperties } from 'react';
import { Zap, Users, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Atomic primitives ported from ui_design/app/atoms.jsx.
 *
 * Conventions:
 *   • Each atom uses CSS variables defined in app/globals.css and
 *     app/design-system.css — no inline color values that would break
 *     dark/light theming or accent-hue swaps.
 *   • SVG-based atoms (Sparkline, Donut, MiniBars, WorldMap) accept explicit
 *     width/height so consumers control sizing.
 *   • All atoms are pure presentational — no data fetching, no router refs.
 */

// ============================================================================
// FLAG — pseudo country flags as 3-stripe gradients (matches ui_design exactly)
// ============================================================================

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

/**
 * 2-letter ISO country code → display name. Used as the hover tooltip on
 * every `<Flag />` so users see "United States" instead of the bare "US"
 * code. Mirrors the keys in `FLAG_COLORS` above so every rendered flag has
 * a friendly label.
 */
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
};

/**
 * Country name → ISO-2 code. Built by inverting CC_TO_COUNTRY, plus common
 * aliases/spellings. Lets callers pass a raw country name (or a code) to
 * <Flag> and to country helpers without each page maintaining its own lossy map.
 */
const COUNTRY_TO_ISO: Record<string, string> = {
	...Object.fromEntries(Object.entries(CC_TO_COUNTRY).map(([code, n]) => [n.toLowerCase(), code])),
	usa: 'US', 'u.s.': 'US', 'u.s.a.': 'US', 'united states of america': 'US',
	uk: 'GB', 'great britain': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB',
	uae: 'AE', 'the netherlands': 'NL', 'holland': 'NL', 'czech republic': 'CZ',
	'south korea': 'KR', 'korea': 'KR', 'republic of korea': 'KR', 'russia': 'RU',
	'viet nam': 'VN', 'hong kong': 'HK', 'türkiye': 'TR', 'turkiye': 'TR',
};

/** Resolve an ISO-2 code from either a 2-letter code or a country name. '' if unknown. */
export function countryToIso(input?: string | null): string {
	if (!input) return '';
	const s = input.trim();
	if (!s) return '';
	if (s.length === 2) {
		const up = s.toUpperCase();
		// Common non-ISO 2-letter codes that flagcdn rejects.
		return up === 'UK' ? 'GB' : up;
	}
	return COUNTRY_TO_ISO[s.toLowerCase()] ?? '';
}

/**
 * Flag — real country flag.
 *
 * Renders the actual flag SVG from flagcdn.com (free, no API key — same
 * "free CDN, no token" approach as the company logos' Google-favicons
 * fallback). If the image fails to load (unknown/unmapped ISO code, CDN
 * hiccup, or offline), it gracefully degrades to the old 3-stripe gradient
 * so a flag cell is never empty.
 *
 * Tooltips: every flag carries `data-tip` + `aria-label` with the full
 * country name (see `.flag[data-tip]` in app/design-system.css) so users
 * hovering/focusing see "United States" rather than the bare "US" code.
 * Callers can override with the `name` prop.
 *
 * To self-host instead (no external dependency at all), swap the `src` for
 * the `flag-icons` npm package's SVGs — the `.flag` wrapper and tooltip stay
 * identical.
 */
export function Flag({
	cc, size = 18, name,
}: {
	/** A 2-letter ISO code OR a full country name (e.g. "US" or "United States"). */
	cc: string;
	size?: number;
	/** Override the hover tooltip — falls back to the CC_TO_COUNTRY map. */
	name?: string;
}) {
	// Accept either an ISO-2 code or a country name. This makes flags resilient
	// to call sites that pass raw `hq_country` (or lossy 2-letter guesses): a
	// real country name resolves to the correct ISO code via COUNTRY_TO_ISO.
	const iso = countryToIso(cc);
	const code = iso.toLowerCase();
	const label = name ?? CC_TO_COUNTRY[iso] ?? cc;
	const [failed, setFailed] = useState(false);
	const colors = FLAG_COLORS[iso] ?? ['#888', '#bbb', '#888'];

	// Custom CSS tooltip via `data-tip`; the browser default `title` is
	// intentionally NOT set so users never see the plain yellow OS popup.
	return (
		<span
			className="flag"
			data-tip={label}
			aria-label={label}
			role="img"
			style={{
				width: size,
				height: size * 0.7,
				display: 'inline-block',
				verticalAlign: 'middle',
				overflow: 'hidden',
				border: 'none',          // override the shared `.flag` hairline border
				// Fallback gradient shows through if the <img> fails / is absent.
				background: `linear-gradient(180deg, ${colors[0]} 0 33%, ${colors[1]} 33% 66%, ${colors[2]} 66%)`,
			}}
		>
			{code && !failed && (
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

// ============================================================================
// LOGO — real brand logo with graceful fallback chain
// ============================================================================

interface LogoProps {
	co: {
		name?: string;
		/** Short initials/emoji override for the fallback block. */
		logo?: string;
		color?: string;
		/** Curated logo URL stored on the company record (best source). */
		custom_logo_url?: string | null;
		/** Company website — used to derive the Google-favicons fallback. */
		website?: string | null;
	};
	size?: number;
}

/**
 * Resolution order:
 *   1. `custom_logo_url` (curated, carried over from the legacy DB)
 *   2. Google Favicons by website domain (free, no token)
 *   3. Coloured initials block (always works, even with no website)
 *
 * `<img>` onError walks to the next source. Clearbit's free Logo API is dead;
 * if a logo.dev token is ever added this is the single place to slot it in
 * between (1) and (2).
 */
export function Logo({ co, size = 32 }: LogoProps) {
	// Build the ordered list of remote candidates for this company.
	const sources: string[] = [];
	if (co.custom_logo_url) sources.push(co.custom_logo_url);
	const domain = extractDomain(co.website);
	if (domain) sources.push(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);

	const [srcIdx, setSrcIdx] = useState(0);
	const src = sources[srcIdx];

	if (src) {
		return (
			<div
				className="co-logo co-logo-img"
				style={{ width: size, height: size }}
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={src}
					alt={co.name ? `${co.name} logo` : 'logo'}
					width={size}
					height={size}
					loading="lazy"
					onError={() => setSrcIdx((i) => i + 1)}
				/>
			</div>
		);
	}

	return (
		<div
			className="co-logo"
			style={{
				width: size,
				height: size,
				background: co.color ?? 'var(--bg-3)',
				color: '#fff',
				fontSize: size * 0.35,
			}}
		>
			{co.logo ?? co.name?.slice(0, 2).toUpperCase() ?? '—'}
		</div>
	);
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

// ============================================================================
// SPARKLINE — small line chart, optional fill
// ============================================================================

/**
 * Build an SVG path for a sparkline scaled to (w, h). Min/max normalised.
 * Uses a Catmull-Rom → cubic-Bezier conversion (tension 0.5) so the line
 * passes smoothly through every data point — looks far better than straight
 * `L` segments on the dashboard's KPI cards where real quarterly series can
 * be jagged.
 */
function sparkPath(values: number[], w: number, h: number): string {
	if (values.length === 0) return '';
	if (values.length === 1) {
		const y = h / 2;
		return `M0,${y.toFixed(1)} L${w},${y.toFixed(1)}`;
	}
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const step = w / (values.length - 1);
	const pts = values.map((v, i) => ({
		x: i * step,
		y: h - ((v - min) / range) * h,
	}));

	// Catmull-Rom to cubic Bezier — smooth curve through every point.
	let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? pts[i + 1];
		const cp1x = p1.x + (p2.x - p0.x) / 6;
		const cp1y = p1.y + (p2.y - p0.y) / 6;
		const cp2x = p2.x - (p3.x - p1.x) / 6;
		const cp2y = p2.y - (p3.y - p1.y) / 6;
		d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
	}
	return d;
}

interface SparklineProps {
	values: number[];
	w?: number;
	h?: number;
	color?: string;
	fill?: boolean;
}

export function Sparkline({ values, w = 70, h = 28, color, fill = true }: SparklineProps) {
	const path = sparkPath(values, w, h);
	if (!path) return null;
	const c = color ?? 'var(--pos)';
	// Close to the baseline + back to start to make a fill region.
	const fillPath = fill ? `${path} L${w.toFixed(1)},${h.toFixed(1)} L0,${h.toFixed(1)} Z` : null;
	return (
		<svg className="stat-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
			{fill && fillPath && <path d={fillPath} fill={c} opacity="0.12" />}
			<path d={path} stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

// ============================================================================
// STAT — KPI card cell (label + big value + delta + sparkline)
// ============================================================================

interface StatProps {
	label: string;
	value: React.ReactNode;
	unit?: string;
	delta?: string;
	deltaDir?: 'pos' | 'neg';
	spark?: number[];
	sparkColor?: string;
}

export function Stat({ label, value, unit, delta, deltaDir = 'pos', spark, sparkColor }: StatProps) {
	// Auto-pick sparkline color from delta direction unless caller overrides.
	// Matches `ui_design_2/app/atoms.jsx:146` behaviour.
	const sc = sparkColor ?? (deltaDir === 'neg' ? 'var(--neg)' : 'var(--pos)');
	return (
		<div className="stat">
			<div className="stat-label">{label}</div>
			<div className="stat-value">
				{value}
				{unit && <span className="unit">{unit}</span>}
			</div>
			<div className="stat-foot">
				{delta && (
					<span className={`stat-delta ${deltaDir}`}>
						{deltaDir === 'pos' ? '▲' : '▼'} {delta}
					</span>
				)}
				{spark && spark.length > 0 && <Sparkline values={spark} color={sc} />}
			</div>
		</div>
	);
}

// ============================================================================
// TAG — small uppercase label chip
// ============================================================================

interface TagProps {
	children: React.ReactNode;
	variant?: '' | 'pos' | 'neg' | 'pill' | 'warn';
	dot?: boolean;
}

export function Tag({ children, variant = '', dot }: TagProps) {
	return (
		<span className={`tag ${variant}`}>
			{dot && (
				<span
					style={{
						width: 6,
						height: 6,
						background: 'currentColor',
						display: 'inline-block',
						borderRadius: '50%',
					}}
				/>
			)}
			{children}
		</span>
	);
}

// ============================================================================
// CHIP — interactive filter chip
// ============================================================================

interface ChipProps {
	active?: boolean;
	count?: number;
	onClick?: () => void;
	children: React.ReactNode;
}

export function Chip({ active, count, onClick, children }: ChipProps) {
	return (
		<button className={`chip ${active ? 'on' : ''}`} onClick={onClick}>
			{children}
			{count != null && <span className="ct">{count}</span>}
		</button>
	);
}

// ============================================================================
// SECTION HEAD — page section title bar with optional meta + action slot
// ============================================================================

interface SectionHeadProps {
	title: React.ReactNode;
	meta?: React.ReactNode;
	action?: React.ReactNode;
}

export function SectionHead({ title, meta, action }: SectionHeadProps) {
	return (
		<div className="section-head">
			<h2>{title}</h2>
			<div className="flex-center">
				{meta && <span className="meta">{meta}</span>}
				{action}
			</div>
		</div>
	);
}

// ============================================================================
// EMPTY — empty state placeholder
// ============================================================================

export function Empty({ msg = 'No results' }: { msg?: string }) {
	return (
		<div
			style={{
				padding: 60,
				textAlign: 'center',
				color: 'var(--fg-muted)',
				fontFamily: 'var(--font-mono)',
				fontSize: 12,
				letterSpacing: '0.1em',
			}}
		>
			{msg.toUpperCase()}
		</div>
	);
}

// ============================================================================
// SECTOR PILL — sector chip with colored icon block
// ============================================================================

interface SectorPillProps {
	color?: string;
	icon?: string;
	name: string;
	slug?: string | null;
}

/**
 * Heuristic sector slug → color/icon mapping. Mirrors the palette used in
 * `ui_design_2/app/data.jsx:SECTORS`. Sectors not in this map fall back to a
 * derived color (hash of slug) so every chip still has a stable distinct hue.
 */
const SECTOR_META: Record<string, { color: string; icon: string }> = {
	'fan-engagement':         { color: 'oklch(62% 0.18 240)', icon: 'F' },
	'media-streaming':        { color: 'oklch(62% 0.18 320)', icon: 'M' },
	'media-and-streaming':    { color: 'oklch(62% 0.18 320)', icon: 'M' },
	'media-production':       { color: 'oklch(62% 0.18 320)', icon: 'M' },
	'streaming-platform':     { color: 'oklch(62% 0.18 320)', icon: 'S' },
	'stadium-facilities':     { color: 'oklch(62% 0.16 200)', icon: 'V' },
	'stadium-and-facilities': { color: 'oklch(62% 0.16 200)', icon: 'V' },
	'venue':                  { color: 'oklch(62% 0.16 200)', icon: 'V' },
	'performance':            { color: 'oklch(62% 0.18 30)',  icon: 'P' },
	'activity-performance':   { color: 'oklch(62% 0.18 30)',  icon: 'P' },
	'wearables-gear':         { color: 'oklch(62% 0.18 60)',  icon: 'G' },
	'wearables-and-gear':     { color: 'oklch(62% 0.18 60)',  icon: 'G' },
	'recovery-wellness':      { color: 'oklch(62% 0.16 130)', icon: 'W' },
	'recovery-and-wellness':  { color: 'oklch(62% 0.16 130)', icon: 'W' },
	'esports':                { color: 'oklch(62% 0.20 280)', icon: 'E' },
	'gaming':                 { color: 'oklch(62% 0.20 280)', icon: 'G' },
	'fantasy-sports':         { color: 'oklch(62% 0.20 260)', icon: 'F' },
	'ticketing-merchandise':  { color: 'oklch(62% 0.18 90)',  icon: 'T' },
	'ticketing-and-merchandise':{ color: 'oklch(62% 0.18 90)', icon: 'T' },
	'tracking-analytics':     { color: 'oklch(62% 0.16 170)', icon: 'T' },
	'analytics':              { color: 'oklch(62% 0.16 170)', icon: 'A' },
	'equipment-infrastructure':{ color: 'oklch(62% 0.16 220)', icon: 'I' },
	'enablement':             { color: 'oklch(62% 0.14 250)', icon: 'E' },
	'management-organisation':{ color: 'oklch(62% 0.16 0)',   icon: 'M' },
};

export function sectorMetaFor(slug: string | null | undefined, name: string): { color: string; icon: string } {
	if (slug) {
		const hit = SECTOR_META[slug.toLowerCase()];
		if (hit) return hit;
	}
	const key = (slug ?? name ?? '').toLowerCase();
	let h = 0;
	for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
	const hue = h % 360;
	return { color: `oklch(60% 0.16 ${hue})`, icon: (name?.[0] ?? '?').toUpperCase() };
}

export function SectorPill({ color, icon, name, slug }: SectorPillProps) {
	const meta = (color && icon)
		? { color, icon }
		: sectorMetaFor(slug, name);
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				fontSize: 12,
				fontWeight: 500,
				color: 'var(--fg-2)',
			}}
		>
			<span
				style={{
					width: 14,
					height: 14,
					background: meta.color,
					color: '#fff',
					display: 'grid',
					placeItems: 'center',
					fontSize: 9,
					fontWeight: 700,
					fontFamily: 'var(--font-display)',
				}}
			>
				{meta.icon}
			</span>
			{name}
		</span>
	);
}

// ============================================================================
// MINI BARS — vertical bar chart with optional X labels
// ============================================================================

interface MiniBarsProps {
	values: number[];
	w?: number;
	h?: number;
	color?: string;
	labels?: string[];
}

export function MiniBars({ values, w = 240, h = 60, color = 'var(--accent)', labels }: MiniBarsProps) {
	if (values.length === 0) return null;
	const max = Math.max(...values, 1);
	const bw = (w - (values.length - 1) * 2) / values.length;
	return (
		<svg width={w} height={h + 16} viewBox={`0 0 ${w} ${h + 16}`}>
			{values.map((v, i) => {
				const bh = (v / max) * h;
				return (
					<g key={i}>
						<rect
							x={i * (bw + 2)}
							y={h - bh}
							width={bw}
							height={bh}
							fill={color}
							opacity={0.25 + (v / max) * 0.75}
						/>
						{labels && (
							<text
								x={i * (bw + 2) + bw / 2}
								y={h + 12}
								textAnchor="middle"
								fontSize="9"
								fill="var(--fg-muted)"
								fontFamily="var(--font-mono)"
							>
								{labels[i]}
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
}

// ============================================================================
// DONUT — concentric ring chart
// ============================================================================

interface DonutSegment {
	v: number;
	color: string;
	label?: string;
}

interface DonutProps {
	segments: DonutSegment[];
	size?: number;
	thickness?: number;
}

export function Donut({ segments, size = 120, thickness = 18 }: DonutProps) {
	const r = (size - thickness) / 2;
	const C = 2 * Math.PI * r;
	const total = segments.reduce((s, x) => s + x.v, 0) || 1;
	let off = 0;
	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				stroke="var(--bg-3)"
				strokeWidth={thickness}
				fill="none"
			/>
			{segments.map((seg, i) => {
				const len = (seg.v / total) * C;
				const dasharray = `${len} ${C - len}`;
				const dashoffset = -off;
				off += len;
				return (
					<circle
						key={i}
						cx={size / 2}
						cy={size / 2}
						r={r}
						stroke={seg.color}
						strokeWidth={thickness}
						fill="none"
						strokeDasharray={dasharray}
						strokeDashoffset={dashoffset}
						transform={`rotate(-90 ${size / 2} ${size / 2})`}
					/>
				);
			})}
		</svg>
	);
}

// ============================================================================
// WORLD MAP — stippled continent outlines + accent dots for active locations
// ============================================================================

const CONTINENT_PATHS: string[] = [
	'M 130 130 Q 145 110 175 115 L 215 110 Q 245 105 275 115 L 305 125 Q 320 135 318 155 L 312 175 Q 320 190 315 205 L 305 220 Q 295 215 285 220 L 275 235 Q 280 250 270 260 L 255 270 Q 245 285 250 300 L 245 315 Q 240 320 232 318 L 225 310 Q 218 295 220 280 L 215 265 Q 205 255 195 248 L 180 240 Q 165 230 155 215 L 145 200 Q 138 185 142 170 L 138 155 Q 130 145 130 130 Z',
	'M 365 80 Q 380 70 405 72 L 425 80 Q 432 95 428 115 L 420 130 Q 405 138 388 132 L 375 120 Q 365 105 365 80 Z',
	'M 270 295 Q 290 285 312 290 L 335 300 Q 348 315 352 335 L 358 360 Q 355 385 340 405 L 322 425 Q 308 438 295 432 L 285 415 Q 282 395 278 380 L 272 360 Q 268 340 268 320 L 270 295 Z',
	'M 458 138 Q 466 132 472 138 L 475 152 Q 472 162 463 165 L 456 158 Q 454 148 458 138 Z',
	'M 445 110 Q 455 105 462 110 L 460 118 Q 452 120 445 117 Z',
	'M 478 145 Q 495 130 515 122 L 535 105 Q 555 95 575 100 L 595 115 Q 600 135 588 152 L 595 175 Q 588 195 568 200 L 545 205 Q 525 210 508 200 L 490 195 Q 478 180 478 165 L 478 145 Z',
	'M 488 220 Q 510 215 540 218 L 575 222 Q 600 230 605 250 L 600 275 Q 605 295 600 315 L 590 340 Q 580 365 570 385 L 560 408 Q 548 422 535 418 L 525 405 Q 515 385 510 365 L 500 340 Q 490 315 488 290 L 485 260 Q 482 240 488 220 Z',
	'M 590 230 Q 615 232 638 240 L 655 258 Q 660 275 650 285 L 632 290 Q 615 285 600 275 L 588 258 Q 585 245 590 230 Z',
	'M 595 105 Q 640 92 700 92 L 770 88 Q 830 90 880 100 L 915 115 Q 925 135 918 155 L 905 175 Q 890 188 870 192 L 855 195 Q 838 210 820 215 L 800 220 Q 785 215 778 230 L 775 250 Q 770 270 755 280 L 738 285 Q 720 280 710 295 L 705 315 Q 695 325 685 320 L 678 305 Q 680 285 685 268 L 690 248 Q 685 230 670 222 L 650 218 Q 628 218 612 208 L 600 195 Q 595 180 596 162 L 595 140 L 595 105 Z',
	'M 882 175 Q 892 168 898 178 L 905 195 Q 902 210 893 215 L 884 205 Q 880 190 882 175 Z',
	'M 760 282 Q 778 278 798 282 L 815 288 Q 818 298 808 302 L 790 305 Q 772 302 762 295 Z',
	'M 825 280 Q 838 278 845 285 L 842 295 Q 832 297 825 290 Z',
	'M 820 245 Q 832 240 838 250 L 835 262 Q 825 264 820 255 Z',
	'M 800 370 Q 825 360 855 362 L 885 372 Q 895 390 888 408 L 865 418 Q 838 422 815 418 L 798 408 Q 790 390 800 370 Z',
	'M 920 415 Q 928 412 932 420 L 928 432 Q 920 432 918 422 Z',
	'M 615 360 Q 622 358 626 368 L 622 388 Q 615 388 612 378 Z',
];

interface WorldMapDot { x: number; y: number; r: number }

interface WorldMapProps {
	height?: number;
	dots?: WorldMapDot[];
}

export function WorldMap({ height = 280, dots = [] }: WorldMapProps) {
	const id = 'stx-world';
	return (
		<svg className="map-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" style={{ height }}>
			<defs>
				<pattern id={`${id}-dots`} x="0" y="0" width="13" height="13" patternUnits="userSpaceOnUse">
					<circle cx="6.5" cy="6.5" r="1.3" fill="var(--fg-muted)" opacity="0.75" />
				</pattern>
				<mask id={`${id}-continents`}>
					<rect width="1000" height="500" fill="black" />
					{CONTINENT_PATHS.map((d, i) => (
						<path key={i} d={d} fill="white" />
					))}
				</mask>
			</defs>
			<rect width="1000" height="500" fill={`url(#${id}-dots)`} mask={`url(#${id}-continents)`} />
			<g fill="none" stroke="var(--border)" strokeWidth="0.6" opacity="0.5">
				{CONTINENT_PATHS.map((d, i) => (
					<path key={i} d={d} />
				))}
			</g>
			{dots.map((d, i) => (
				<g key={i}>
					<circle cx={d.x} cy={d.y} r={d.r + 6} fill="var(--accent)" opacity="0.15" />
					<circle cx={d.x} cy={d.y} r={d.r} fill="var(--accent)" />
					<circle cx={d.x} cy={d.y} r={d.r * 0.4} fill="#fff" />
				</g>
			))}
		</svg>
	);
}

// ============================================================================
// HEATMAP — 8-column grid of color-mixed cells with row labels + Cool/Hot scale
// Matches ui_design/screens-1.jsx HeatGrid exactly.
// ============================================================================

interface HeatmapRow {
	label: string;
	values: number[];
}

interface HeatmapProps {
	data: HeatmapRow[];
	/** Optional column labels; defaults to Q1'24..Q4'25 to match the design. */
	columns?: string[];
}

export function Heatmap({ data, columns }: HeatmapProps) {
	if (data.length === 0) return null;
	const all = data.flatMap((r) => r.values);
	const max = Math.max(...all);
	const min = Math.min(...all);
	const cols = columns ?? data[0].values.map((_, i) => `Q${(i % 4) + 1}${i >= 4 ? "'25" : "'24"}`);
	const colCount = data[0].values.length;
	const gridCols = `110px repeat(${colCount}, 1fr)`;
	return (
		<div>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: gridCols,
					gap: 2,
					fontSize: 10,
					fontFamily: 'var(--font-mono)',
					color: 'var(--fg-muted)',
					marginBottom: 6,
					textTransform: 'uppercase',
					letterSpacing: '0.06em',
				}}
			>
				<span />
				{cols.map((c, i) => <span key={i} style={{ textAlign: 'center' }}>{c}</span>)}
			</div>
			{data.map((row) => (
				<div key={row.label} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2, marginBottom: 2 }}>
					<span style={{ fontSize: 12, color: 'var(--fg-2)', display: 'flex', alignItems: 'center' }}>
						{row.label}
					</span>
					{row.values.map((v, i) => {
						const t = (v - min) / (max - min || 1);
						const intensity = 0.15 + t * 0.85;
						return (
							<div
								key={i}
								style={{
									aspectRatio: '1',
									background: `color-mix(in oklch, var(--accent) ${intensity * 100}%, var(--bg-2))`,
									display: 'grid',
									placeItems: 'center',
									fontSize: 9,
									fontFamily: 'var(--font-mono)',
									fontWeight: 600,
									color: t > 0.6 ? 'var(--accent-fg)' : 'var(--fg-2)',
								}}
							>
								{v}
							</div>
						);
					})}
				</div>
			))}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					marginTop: 12,
					fontSize: 10,
					fontFamily: 'var(--font-mono)',
					color: 'var(--fg-muted)',
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
				}}
			>
				<span>Cool</span>
				{[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (
					<div
						key={t}
						style={{
							flex: 1,
							height: 6,
							background: `color-mix(in oklch, var(--accent) ${t * 100}%, var(--bg-2))`,
						}}
					/>
				))}
				<span>Hot</span>
			</div>
		</div>
	);
}

// ============================================================================
// PIPELINE FUNNEL — horizontal 5-stage funnel bars (ui_design/screens-1.jsx)
// ============================================================================

interface FunnelStage {
	label: string;
	value: number;
	color?: string;
}

export function PipelineFunnel({ stages }: { stages: FunnelStage[] }) {
	if (stages.length === 0) return null;
	const max = stages[0].value;
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			{stages.map((s, i) => {
				const w = (s.value / max) * 100;
				const c = s.color ?? (i === 0 ? 'var(--bg-3)' : 'var(--accent)');
				return (
					<div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<div style={{ width: 130, fontSize: 12, color: 'var(--fg-2)' }}>{s.label}</div>
						<div style={{ flex: 1, height: 22, background: 'var(--bg-2)', position: 'relative' }}>
							<div
								style={{
									position: 'absolute',
									inset: 0,
									width: `${w}%`,
									background: c,
									opacity: i === 0 ? 0.4 : 1,
								}}
							/>
							<div
								style={{
									position: 'relative',
									padding: '0 8px',
									height: '100%',
									display: 'flex',
									alignItems: 'center',
									fontFamily: 'var(--font-mono)',
									fontSize: 11,
									fontWeight: 700,
									color: i >= 1 ? '#fff' : 'var(--fg)',
								}}
							>
								{s.value.toLocaleString()}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ============================================================================
// PAGE — page-level container that applies the design's `page-pad` class
// ============================================================================

export function Page({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
	return <div className="page-pad" style={style}>{children}</div>;
}

// ============================================================================
// VERIFIED BADGE — diamond/star with check. Ported from
// `ui_design_2/app/company-detail.jsx`. Used on company name lockups + lists.
// ============================================================================

export function VerifiedBadge({ size = 16, title = 'Verified — claimed and maintained by the company' }: { size?: number; title?: string }) {
	return (
		<span
			className="vb"
			title={title}
			aria-label="Verified"
			style={{ width: size, height: size, display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}
		>
			<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
				{/* Clean scalloped seal (Twitter/X-style) filled with the accent. */}
				<path
					fill="var(--accent)"
					d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
				/>
				{/* Knockout check in the page background colour. */}
				<path
					d="M9.6 12.3l1.9 1.9 4-4.3"
					fill="none"
					stroke="var(--bg)"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</span>
	);
}

// ============================================================================
// RAISING PILL — pulsing green dot + "Actively raising" label
// ============================================================================

export function RaisingPill({ compact = false }: { compact?: boolean }) {
	return (
		<span className={`rp ${compact ? 'compact' : ''}`} title="Actively raising — self-reported by the company">
			<span className="rp-dot" />
			{compact ? 'Raising' : 'Actively raising'}
		</span>
	);
}

export function RaisingDot({ size = 8 }: { size?: number }) {
	return (
		<span
			className="rp-dot rp-dot-solo"
			style={{ width: size, height: size }}
			title="Actively raising — self-reported by the company"
			aria-label="Actively raising"
		/>
	);
}

// ============================================================================
// KV — label/value row used in company detail right rail + drawer
// ============================================================================

export function KV({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
	return (
		<div className="co-kv">
			<span className="co-kv-k">{label}</span>
			<span className="co-kv-v">{value}</span>
		</div>
	);
}

// ============================================================================
// AUDIENCE — the three FOR groups (Athletes / Fans / Executives) that anchor
// the framework taxonomy. Used on framework column heads + sector cells in
// dashboard/companies/funding/ma tables.
// ============================================================================

export type Audience = 'athletes' | 'fans' | 'executives' | 'business';

const AUDIENCE_META: Record<Audience, { Icon: LucideIcon; color: string; label: string }> = {
	athletes:   { Icon: Zap,       color: 'oklch(62% 0.18 290)', label: 'Athletes' },
	fans:       { Icon: Users,     color: 'oklch(62% 0.20 240)', label: 'Fans' },
	executives: { Icon: Briefcase, color: 'oklch(62% 0.16 160)', label: 'Executives' },
	business:   { Icon: Briefcase, color: 'oklch(62% 0.16 160)', label: 'Executives' },
};

export function audienceColor(a: Audience): string {
	return AUDIENCE_META[a]?.color ?? 'var(--fg-muted)';
}

export function AudienceIcon({ audience, size = 14, style }: { audience: Audience; size?: number; style?: CSSProperties }) {
	const meta = AUDIENCE_META[audience];
	if (!meta) return null;
	const { Icon } = meta;
	return <Icon size={size} style={style} />;
}

/**
 * Sector slug → audience map. The backend stores `primary_sector_slug` as
 * the sub-sector (e.g. "performance", "fan_engagement") — this maps those
 * to the FOR-audience taxonomy from ui_design_2/data.jsx SECTORS.
 *
 * Keys are slug fragments matched case-insensitively against the start of
 * the slug, so "performance-analytics" → athletes via the "performance"
 * key. Unknown slugs return null and the caller can fall back to a plain
 * SectorPill or the sector name.
 */
const SECTOR_AUDIENCE: Array<{ match: RegExp; audience: Audience }> = [
	{ match: /^(performance|wearable|recovery|wellness|training|gear|nutrition|biomechanic)/i, audience: 'athletes' },
	{ match: /^(fan|media|streaming|content|esports|gaming|engagement|broadcast|community)/i, audience: 'fans' },
	{ match: /^(business|operations|management|venue|stadium|facility|ticketing|merchandise|sponsorship|league|club)/i, audience: 'executives' },
];

export function sectorToAudience(sectorSlugOrName: string | null | undefined): Audience | null {
	if (!sectorSlugOrName) return null;
	const key = sectorSlugOrName.toLowerCase().replace(/[\s&]+/g, '_');
	for (const { match, audience } of SECTOR_AUDIENCE) {
		if (match.test(key)) return audience;
	}
	return null;
}

/**
 * AudiencePill — sector icon (in the audience's brand color) next to the
 * sector name. Ported from `ui_design_2/app/atoms.jsx:218-234`.
 *
 * Two usage modes:
 *   1. `<AudiencePill audience="athletes" label="Performance" />` — explicit
 *   2. `<AudiencePill sectorSlug={c.primary_sector_slug} label={c.primary_sector} />`
 *      — derives audience from the slug; falls back to muted icon if unknown.
 */
export function AudiencePill({
	audience, sectorSlug, label, size = 'md',
}: {
	audience?: Audience;
	sectorSlug?: string | null;
	label?: string;
	size?: 'sm' | 'md';
}) {
	const a: Audience | null = audience ?? sectorToAudience(sectorSlug);
	const meta = a ? AUDIENCE_META[a] : null;
	const color = meta?.color ?? 'var(--fg-muted)';
	const Icon = meta?.Icon ?? Briefcase;
	const text = label ?? meta?.label ?? '—';
	const iconSize = size === 'sm' ? 14 : 16;
	return (
		<span className="audience-pill" title={text}>
			<span className="audience-pill-icon" style={{ color }}>
				<Icon size={iconSize} />
			</span>
			<span className="audience-pill-name">{text}</span>
		</span>
	);
}

// ============================================================================
// PAGE TITLE — kicker + h1 + subtitle stack used at the top of every page.
// Extracted from the inline JSX repeated across all ui_design_2 screens.
// ============================================================================

interface PageTitleProps {
	kicker?: React.ReactNode;
	title: React.ReactNode;
	sub?: React.ReactNode;
	action?: React.ReactNode;
}

export function PageTitle({ kicker, title, sub, action }: PageTitleProps) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'space-between',
				marginBottom: 'var(--space-5)',
				gap: 24,
				flexWrap: 'wrap',
			}}
		>
			<div style={{ minWidth: 0, flex: '1 1 auto' }}>
				{kicker && (
					<div
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 11,
							color: 'var(--fg-muted)',
							textTransform: 'uppercase',
							letterSpacing: '0.1em',
							marginBottom: 6,
						}}
					>
						{kicker}
					</div>
				)}
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: 0,
					}}
				>
					{title}
				</h1>
				{sub && (
					<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 720, margin: '6px 0 0', lineHeight: 1.5 }}>
						{sub}
					</p>
				)}
			</div>
			{action && <div style={{ display: 'flex', gap: 8 }}>{action}</div>}
		</div>
	);
}
