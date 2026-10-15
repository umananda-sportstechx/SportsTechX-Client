/**
 * Canonical country list + name normalisation.
 *
 * The `locations` table stores country as free text, so the live facets carry
 * duplicates ("USA" / "United States" / "United States of America"), stray
 * placeholders ("#N/A", "NA") and the odd junk row ("gfgdfr"). This module is
 * the single clean reference the UI uses instead:
 *   - `COUNTRIES` — the full set offered in onboarding pickers, so a user from
 *     any country can select theirs (not limited to what's already in the data).
 *   - `canonicalCountry()` — folds every known spelling to one display name.
 *   - `isKnownCountry()` — drops junk/placeholder values from data-driven filters.
 */

// ISO 3166 common-usage English short names.
export const COUNTRIES: string[] = [
	'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia',
	'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
	'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
	'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad',
	'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia',
	'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
	'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
	'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
	'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
	'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
	'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
	'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
	'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
	'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
	'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
	'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
	'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
	'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
	'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
	'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
	'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
	'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
	'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

// Spellings the data uses that aren't the canonical short name above.
const VARIANTS: Record<string, string> = {
	usa: 'United States', 'u.s.': 'United States', 'u.s.a.': 'United States',
	'united states of america': 'United States', 'united states (usa)': 'United States', america: 'United States',
	uk: 'United Kingdom', 'u.k.': 'United Kingdom', 'great britain': 'United Kingdom', britain: 'United Kingdom',
	england: 'United Kingdom', scotland: 'United Kingdom', wales: 'United Kingdom', 'northern ireland': 'United Kingdom',
	uae: 'United Arab Emirates', 'the netherlands': 'Netherlands', holland: 'Netherlands',
	'czech republic': 'Czechia', 'south korea (republic of korea)': 'South Korea', 'republic of korea': 'South Korea',
	korea: 'South Korea', 'viet nam': 'Vietnam', 'türkiye': 'Turkey', turkiye: 'Turkey', 'ivory coast': 'Ivory Coast',
	"cote d'ivoire": 'Ivory Coast', russia: 'Russia', 'russian federation': 'Russia', 'hong kong sar': 'Hong Kong',
};

const BY_LOWER = new Map(COUNTRIES.map((c) => [c.toLowerCase(), c]));

/** Fold any known spelling to one display name; unknown values pass through. */
export function canonicalCountry(raw: string | null | undefined): string {
	if (!raw) return '';
	const s = raw.trim();
	if (!s) return '';
	const k = s.toLowerCase();
	return BY_LOWER.get(k) ?? VARIANTS[k] ?? s;
}

/** True only for a recognised country — used to drop junk/placeholder facet rows. */
export function isKnownCountry(raw: string | null | undefined): boolean {
	if (!raw) return false;
	const k = raw.trim().toLowerCase();
	return BY_LOWER.has(k) || k in VARIANTS;
}

/** Placeholder/junk values data-driven filters should never show. */
const JUNK = new Set(['', '#n/a', 'n/a', 'na', 'null', 'none', 'unknown', 'undefined', '-', '—']);
export const isJunkFacet = (raw: string | null | undefined): boolean =>
	!raw || JUNK.has(raw.trim().toLowerCase());

/** [value, label] options for a full country picker (onboarding/claim). */
export const COUNTRY_SELECT_OPTIONS: [string, string][] = COUNTRIES.map((c) => [c, c]);
