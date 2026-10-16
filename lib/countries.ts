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

/**
 * ISO 3166-1 alpha-2 code for every country above (keyed by the canonical
 * lower-case name). This is the single source for flag rendering — the two Flag
 * components used to carry their own ~70-entry maps, so most countries showed no
 * flag and some diverged between views. flagcdn.com serves all of these.
 */
export const COUNTRY_ISO: Record<string, string> = {
	afghanistan: 'AF', albania: 'AL', algeria: 'DZ', andorra: 'AD', angola: 'AO',
	'antigua and barbuda': 'AG', argentina: 'AR', armenia: 'AM', australia: 'AU',
	austria: 'AT', azerbaijan: 'AZ', bahamas: 'BS', bahrain: 'BH', bangladesh: 'BD',
	barbados: 'BB', belarus: 'BY', belgium: 'BE', belize: 'BZ', benin: 'BJ',
	bhutan: 'BT', bolivia: 'BO', 'bosnia and herzegovina': 'BA', botswana: 'BW',
	brazil: 'BR', brunei: 'BN', bulgaria: 'BG', 'burkina faso': 'BF', burundi: 'BI',
	cambodia: 'KH', cameroon: 'CM', canada: 'CA', 'cape verde': 'CV',
	'central african republic': 'CF', chad: 'TD', chile: 'CL', china: 'CN',
	colombia: 'CO', comoros: 'KM', congo: 'CG', 'costa rica': 'CR', croatia: 'HR',
	cuba: 'CU', cyprus: 'CY', czechia: 'CZ', 'democratic republic of the congo': 'CD',
	denmark: 'DK', djibouti: 'DJ', dominica: 'DM', 'dominican republic': 'DO',
	ecuador: 'EC', egypt: 'EG', 'el salvador': 'SV', 'equatorial guinea': 'GQ',
	eritrea: 'ER', estonia: 'EE', eswatini: 'SZ', ethiopia: 'ET', fiji: 'FJ',
	finland: 'FI', france: 'FR', gabon: 'GA', gambia: 'GM', georgia: 'GE',
	germany: 'DE', ghana: 'GH', greece: 'GR', grenada: 'GD', guatemala: 'GT',
	guinea: 'GN', 'guinea-bissau': 'GW', guyana: 'GY', haiti: 'HT', honduras: 'HN',
	'hong kong': 'HK', hungary: 'HU', iceland: 'IS', india: 'IN', indonesia: 'ID',
	iran: 'IR', iraq: 'IQ', ireland: 'IE', israel: 'IL', italy: 'IT',
	'ivory coast': 'CI', jamaica: 'JM', japan: 'JP', jordan: 'JO', kazakhstan: 'KZ',
	kenya: 'KE', kiribati: 'KI', kosovo: 'XK', kuwait: 'KW', kyrgyzstan: 'KG',
	laos: 'LA', latvia: 'LV', lebanon: 'LB', lesotho: 'LS', liberia: 'LR',
	libya: 'LY', liechtenstein: 'LI', lithuania: 'LT', luxembourg: 'LU',
	madagascar: 'MG', malawi: 'MW', malaysia: 'MY', maldives: 'MV', mali: 'ML',
	malta: 'MT', 'marshall islands': 'MH', mauritania: 'MR', mauritius: 'MU',
	mexico: 'MX', micronesia: 'FM', moldova: 'MD', monaco: 'MC', mongolia: 'MN',
	montenegro: 'ME', morocco: 'MA', mozambique: 'MZ', myanmar: 'MM', namibia: 'NA',
	nauru: 'NR', nepal: 'NP', netherlands: 'NL', 'new zealand': 'NZ',
	nicaragua: 'NI', niger: 'NE', nigeria: 'NG', 'north korea': 'KP',
	'north macedonia': 'MK', norway: 'NO', oman: 'OM', pakistan: 'PK', palau: 'PW',
	palestine: 'PS', panama: 'PA', 'papua new guinea': 'PG', paraguay: 'PY',
	peru: 'PE', philippines: 'PH', poland: 'PL', portugal: 'PT', qatar: 'QA',
	romania: 'RO', russia: 'RU', rwanda: 'RW', 'saint kitts and nevis': 'KN',
	'saint lucia': 'LC', 'saint vincent and the grenadines': 'VC', samoa: 'WS',
	'san marino': 'SM', 'sao tome and principe': 'ST', 'saudi arabia': 'SA',
	senegal: 'SN', serbia: 'RS', seychelles: 'SC', 'sierra leone': 'SL',
	singapore: 'SG', slovakia: 'SK', slovenia: 'SI', 'solomon islands': 'SB',
	somalia: 'SO', 'south africa': 'ZA', 'south korea': 'KR', 'south sudan': 'SS',
	spain: 'ES', 'sri lanka': 'LK', sudan: 'SD', suriname: 'SR', sweden: 'SE',
	switzerland: 'CH', syria: 'SY', taiwan: 'TW', tajikistan: 'TJ', tanzania: 'TZ',
	thailand: 'TH', 'timor-leste': 'TL', togo: 'TG', tonga: 'TO',
	'trinidad and tobago': 'TT', tunisia: 'TN', turkey: 'TR', turkmenistan: 'TM',
	tuvalu: 'TV', uganda: 'UG', ukraine: 'UA', 'united arab emirates': 'AE',
	'united kingdom': 'GB', 'united states': 'US', uruguay: 'UY', uzbekistan: 'UZ',
	vanuatu: 'VU', 'vatican city': 'VA', venezuela: 'VE', vietnam: 'VN', yemen: 'YE',
	zambia: 'ZM', zimbabwe: 'ZW',
};

const ISO_SET = new Set(Object.values(COUNTRY_ISO));
const ISO_TO_NAME = new Map(
	COUNTRIES.map((n) => [COUNTRY_ISO[n.toLowerCase()], n]).filter(([code]) => code) as [string, string][],
);

/**
 * Resolve an ISO-2 code from a country name (any known spelling) or a bare
 * 2-letter code. Junk/placeholder values ("NA", "#N/A", …) return '' so they
 * never render a wrong flag — notably the "NA" placeholder, which is also
 * Namibia's real code and used to paint Namibia's flag. A bare 2-letter code is
 * trusted only when it's a real ISO code we recognise.
 */
export function countryToIso(input?: string | null): string {
	if (isJunkFacet(input)) return '';
	const s = (input ?? '').trim();
	const byName = COUNTRY_ISO[canonicalCountry(s).toLowerCase()];
	if (byName) return byName;
	if (s.length === 2) {
		const code = s.toUpperCase() === 'UK' ? 'GB' : s.toUpperCase();
		return ISO_SET.has(code) ? code : '';
	}
	return '';
}

/** Display name for an ISO-2 code, '' if unknown. */
export const isoToCountry = (code?: string | null): string =>
	code ? ISO_TO_NAME.get(code.toUpperCase()) ?? '' : '';
