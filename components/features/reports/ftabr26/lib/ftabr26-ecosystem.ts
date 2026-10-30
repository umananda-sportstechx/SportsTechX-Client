// @ts-nocheck
/* eslint-disable */
/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 — the report's ecosystem tables.

   Rows come live from /api/report/ftabr26/ecosystem, which reads whatever is
   flagged `in_ftabr26` in the master tables. FTABR26 currently publishes
   initiatives and programs; events are intentionally omitted from the report.

   Neither master table stores a logo, so logos are resolved from `website`
   through logo.dev — the same route every other logo in the product takes.
   ──────────────────────────────────────────────────────────────────────── */

import type { Ftabr26Ecosystem, Ftabr26EcosystemEntry, Ftabr26Startup } from "./ftabr26-types";
import {
  FTABR26_INITIATIVES, FTABR26_ACCELERATORS, FTABR26_STARTUPS,
  type EcosystemEntry,
} from "../data/ftabr26-content-data";

export type { Ftabr26Ecosystem, Ftabr26EcosystemEntry, Ftabr26Startup };

export type Ftabr26EcosystemResolved = Ftabr26Ecosystem & {
  /** False when the committed constants are being served, so the UI can say so. */
  isLive: boolean;
};

/* ── Domain → logo ─────────────────────────────────────────────────────── */

/** Bare hostname from a stored website value, which may omit the scheme. */
export function ecoDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  const d = website.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .replace(/[?#].*$/, "");
  return d.length > 0 && d.includes(".") ? d.toLowerCase() : null;
}

/** Full https URL for the row's name link, or null when there is no site. */
export function ecoHref(website: string | null | undefined): string | null {
  if (!website) return null;
  const w = website.trim();
  if (w.length === 0) return null;
  return /^https?:\/\//i.test(w) ? w : `https://${w}`;
}

/**
 * Logo for a row (Google's favicon service, as across Atlas), or null when the
 * website yields no domain — callers fall back to a monogram in that case.
 */
export function ecoLogoUrl(website: string | null | undefined, size = 64): string | null {
  const domain = ecoDomain(website);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?sz=${size >= 128 ? 128 : 64}&domain=${encodeURIComponent(domain)}`;
}

const INITIATIVE_LOGO_DOMAINS: Record<string, string> = {
  "Fan Engagement Startup Challenge (La Liga x Sportboost)": "laliga.com",
  "Future of Sport Lab x FIFA 2026 Legacy Incubation Hub": "futuresportlab.com",
  "Real Madrid Next": "realmadrid.com",
};

/** Prefer an official initiative/parent brand when the stored site has no logo. */
export function ecoInitiativeLogoUrl(
  name: string,
  website: string | null | undefined,
  size = 64,
): string | null {
  // Use the organiser's official mark rather than a third-party domain lookup.
  if (ecoDomain(website) === "sportandsociety.com") {
    return "/reports/ftabr26/sport-and-society-logo.png";
  }
  return ecoLogoUrl(INITIATIVE_LOGO_DOMAINS[name] ?? website, size);
}

/* ── Country → flag ────────────────────────────────────────────────────── */

const COUNTRY_ISO: Record<string, string> = {
  "usa": "US", "us": "US", "united states": "US", "united states of america": "US",
  "uk": "GB", "united kingdom": "GB", "england": "GB", "scotland": "GB", "wales": "GB",
  "france": "FR", "germany": "DE", "spain": "ES", "italy": "IT",
  "netherlands": "NL", "the netherlands": "NL", "holland": "NL",
  "switzerland": "CH", "finland": "FI", "australia": "AU", "israel": "IL",
  "canada": "CA", "ireland": "IE", "india": "IN", "brazil": "BR",
  "japan": "JP", "china": "CN", "south korea": "KR", "singapore": "SG",
  "norway": "NO", "sweden": "SE", "denmark": "DK", "portugal": "PT",
  "belgium": "BE", "austria": "AT", "poland": "PL", "czech republic": "CZ",
  "czechia": "CZ", "mexico": "MX", "argentina": "AR", "chile": "CL",
  "colombia": "CO", "peru": "PE", "uruguay": "UY", "uae": "AE",
  "united arab emirates": "AE", "saudi arabia": "SA", "qatar": "QA",
  "kuwait": "KW", "bahrain": "BH", "oman": "OM", "turkey": "TR",
  "south africa": "ZA", "nigeria": "NG", "kenya": "KE", "egypt": "EG",
  "morocco": "MA", "ghana": "GH", "new zealand": "NZ", "malaysia": "MY",
  "indonesia": "ID", "thailand": "TH", "vietnam": "VN", "philippines": "PH",
  "pakistan": "PK", "bangladesh": "BD", "sri lanka": "LK",
  "russia": "RU", "ukraine": "UA", "romania": "RO", "hungary": "HU",
  "greece": "GR", "lithuania": "LT", "latvia": "LV", "estonia": "EE",
  "iceland": "IS", "luxembourg": "LU", "gibraltar": "GI", "malta": "MT",
  "croatia": "HR", "serbia": "RS", "bulgaria": "BG", "slovakia": "SK",
  "slovenia": "SI", "cyprus": "CY", "monaco": "MC", "andorra": "AD",
};

/** Lowercase ISO-3166 alpha-2, as flagcdn expects it, or null when unmapped. */
export function ecoFlagCode(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = COUNTRY_ISO[country.trim().toLowerCase()];
  return code ? code.toLowerCase() : null;
}

/* flagcdn only serves this fixed ladder of sizes. An off-ladder request (a
   computed "15x11", say) comes back as an error page, which the browser then
   blocks as a cross-origin non-image — so heights snap to the ladder rather
   than being derived from the row's font size. */
const FLAG_SIZES: [number, number][] = [
  [16, 12], [20, 15], [24, 18], [28, 21], [32, 24], [36, 27], [40, 30],
  [48, 36], [56, 42], [64, 48], [80, 60], [96, 72], [112, 84], [128, 96],
];

/** flagcdn PNG at the smallest listed size that covers `height`. */
export function ecoFlagUrl(country: string | null | undefined, height = 12): string | null {
  const code = ecoFlagCode(country);
  if (!code) return null;
  const [w, h] = FLAG_SIZES.find(([, sh]) => sh >= height) ?? FLAG_SIZES[FLAG_SIZES.length - 1];
  return `https://flagcdn.com/${w}x${h}/${code}.png`;
}

/* ── Continents ────────────────────────────────────────────────────────────
   The ecosystem map groups rows into the same six bubbles the gster26 map
   draws, at the same centres, so the two reports read as one atlas. See
   client/src/components/ftabr26-ecosystem-map.tsx and, for the static PNG the
   PDF and social cards use, scripts/build-ftabr26-map.mjs.
   ──────────────────────────────────────────────────────────────────────── */

export const FTABR26_CONTINENTS = [
  { id: "North America", label: "N. America", center: [-95, 48] },
  { id: "South America", label: "S. America", center: [-58, -15] },
  { id: "Europe",        label: "Europe",     center: [15, 52] },
  { id: "Africa",        label: "Africa",     center: [22, 3] },
  { id: "Asia",          label: "Asia",       center: [90, 40] },
  { id: "Oceania",       label: "Oceania",    center: [135, -25] },
] as const satisfies readonly { id: string; label: string; center: readonly [number, number] }[];

export type Ftabr26ContinentId = typeof FTABR26_CONTINENTS[number]["id"];

/** The report's map splits every bubble by these two published lists. */
export type Ftabr26EcoType = "initiatives" | "programs";
export const FTABR26_ECO_TYPES: readonly Ftabr26EcoType[] = ["initiatives", "programs"];

export type Ftabr26ContinentCounts = Record<Ftabr26EcoType, number>;

/** Folds the master tables' free-text continent onto one of the six bubbles. */
export function ecoNormalizeContinent(raw: string | null | undefined): Ftabr26ContinentId | null {
  if (!raw) return null;
  const l = raw.toLowerCase().trim();
  if (l.includes("north america")) return "North America";
  if (l.includes("south america") || l.includes("latin")) return "South America";
  if (l.includes("europe")) return "Europe";
  if (l.includes("africa")) return "Africa";
  if (l.includes("asia") || l.includes("apac") || l.includes("middle east")) return "Asia";
  if (l.includes("oceania") || l.includes("australia") || l.includes("pacific")) return "Oceania";
  return null;
}

/* Only consulted when `continent` is blank. Keyed by ISO code rather than
   country name so every spelling COUNTRY_ISO already folds — "USA", "United
   States of America", "England" — arrives here as one key. Türkiye and Russia
   sit in Europe, where their football ecosystems do. */
const ISO_CONTINENT: Record<string, Ftabr26ContinentId> = {
  US: "North America", CA: "North America", MX: "North America",
  BR: "South America", AR: "South America", CL: "South America", CO: "South America",
  PE: "South America", UY: "South America",
  GB: "Europe", FR: "Europe", DE: "Europe", ES: "Europe", IT: "Europe", NL: "Europe",
  CH: "Europe", FI: "Europe", IE: "Europe", NO: "Europe", SE: "Europe", DK: "Europe",
  PT: "Europe", BE: "Europe", AT: "Europe", PL: "Europe", CZ: "Europe", RU: "Europe",
  UA: "Europe", RO: "Europe", HU: "Europe", GR: "Europe", LT: "Europe", LV: "Europe",
  EE: "Europe", IS: "Europe", LU: "Europe", GI: "Europe", MT: "Europe", HR: "Europe",
  RS: "Europe", BG: "Europe", SK: "Europe", SI: "Europe", CY: "Europe", MC: "Europe",
  AD: "Europe", TR: "Europe",
  IL: "Asia", IN: "Asia", JP: "Asia", CN: "Asia", KR: "Asia", SG: "Asia", AE: "Asia",
  SA: "Asia", QA: "Asia", KW: "Asia", BH: "Asia", OM: "Asia", MY: "Asia", ID: "Asia",
  TH: "Asia", VN: "Asia", PH: "Asia", PK: "Asia", BD: "Asia", LK: "Asia",
  ZA: "Africa", NG: "Africa", KE: "Africa", EG: "Africa", MA: "Africa", GH: "Africa",
  AU: "Oceania", NZ: "Oceania",
};

/**
 * The bubble a row belongs to: its own continent when the master table carries
 * one, else the country's. Null for a row we cannot place — those are counted
 * out of the map rather than dropped into an arbitrary region.
 */
export function ecoContinent(entry: Pick<Ftabr26EcosystemEntry, "continent" | "country">): Ftabr26ContinentId | null {
  const named = ecoNormalizeContinent(entry.continent);
  if (named) return named;
  const iso = ecoFlagCode(entry.country);
  return iso ? ISO_CONTINENT[iso.toUpperCase()] ?? null : null;
}

export type Ftabr26MapData = {
  /** continent id → per-type counts, every continent present even at zero. */
  counts: Record<Ftabr26ContinentId, Ftabr26ContinentCounts>;
  /** Rows that carry no placeable location, by type. */
  unplaced: Ftabr26ContinentCounts;
  /** Rows actually drawn on the map. Zero means there is nothing to show. */
  plotted: number;
};

/** Per-continent tallies for the map, over exactly the rows the tables list. */
export function ftabr26MapData(eco: {
  initiatives: Ftabr26EcosystemEntry[];
  programs: Ftabr26EcosystemEntry[];
}): Ftabr26MapData {
  const counts = Object.fromEntries(
    FTABR26_CONTINENTS.map(c => [c.id, { initiatives: 0, programs: 0 }]),
  ) as Record<Ftabr26ContinentId, Ftabr26ContinentCounts>;
  const unplaced: Ftabr26ContinentCounts = { initiatives: 0, programs: 0 };
  let plotted = 0;

  for (const type of FTABR26_ECO_TYPES) {
    for (const row of eco[type]) {
      const continent = ecoContinent(row);
      if (!continent) { unplaced[type]++; continue; }
      counts[continent][type]++;
      plotted++;
    }
  }
  return { counts, unplaced, plotted };
}

/* ── Live/fallback resolution ──────────────────────────────────────────── */

const fromConstants = (rows: EcosystemEntry[]): Ftabr26EcosystemEntry[] =>
  rows.map(r => ({
    rank: r.rank,
    name: r.name,
    website: r.url ?? null,
    city: r.hq || null,
    country: null,
    /* The committed lists predate the column, so these rows never place on
       the map — the map hides itself when nothing is placeable. */
    continent: null,
  }));

const list = (
  live: Ftabr26EcosystemEntry[] | undefined,
  fallback: EcosystemEntry[],
): Ftabr26EcosystemEntry[] =>
  live && live.length > 0 ? live : fromConstants(fallback);

/* These two programs have no city/country in programs_master, so the feed sends
   them through blank and the table renders an empty location. Filled in here
   rather than at the source; delete an entry once its row is corrected.
   Keyed by startupMatchKey, so "Barça Startup Challenge" → barastartupchallenge. */
const PROGRAM_LOCATIONS: Record<string, { city: string; country: string }> = {
  barastartupchallenge: { city: "Barcelona", country: "Spain" },
  juventusforward:      { city: "Turin",     country: "Italy" },
};

/** Fill two blanks and apply the requested report-only Budapest location. */
const withLocations = (rows: Ftabr26EcosystemEntry[]): Ftabr26EcosystemEntry[] =>
  rows.map(e => {
    if (startupMatchKey(e.name) === "uefachampionsinnovate") {
      return { ...e, city: "Budapest", country: "Hungary" };
    }
    if (e.city) return e;
    const fix = PROGRAM_LOCATIONS[startupMatchKey(e.name)];
    return fix ? { ...e, ...fix } : e;
  });

/** Every list falls back independently, matching resolveFtabr26Facts. */
export function resolveFtabr26Ecosystem(live: Ftabr26Ecosystem | undefined): Ftabr26EcosystemResolved {
  return {
    initiatives: list(live?.initiatives, FTABR26_INITIATIVES),
    programs: withLocations(list(live?.programs, FTABR26_ACCELERATORS)),
    // Keep the shared payload shape intact, but omit events from FTABR26.
    events: [],
    isLive: Boolean(live && live.initiatives && live.initiatives.length > 0),
  };
}


/* ── Startups to watch ─────────────────────────────────────────────────────
   The companies flagged `in_ftabr26` in sm_test, from
   /api/report/ftabr26/startups. Same live/fallback contract as the ecosystem
   lists above, so the report and the PDF always show the same companies.
   ──────────────────────────────────────────────────────────────────────── */

export type Ftabr26StartupsResolved = {
  startups: Ftabr26Startup[];
  /** False when the committed snapshot is being served. */
  isLive: boolean;
};

/**
 * Card logo: an uploaded override wins, otherwise logo.dev off the website.
 * Null when neither is available, so callers fall back to a monogram.
 */
export function startupLogoUrl(s: Ftabr26Startup, size = 64): string | null {
  return s.logoUrl ?? ecoLogoUrl(s.website, size);
}

/* ── Roster → startup join ─────────────────────────────────────────────────
   The Playmakers roster names companies in its own words ("ReSpo.Vision",
   "turfcoach") while the feed names them in the database's ("Respo Vision",
   "Turf Coach"), and the feed is live, so spellings can drift after this file
   ships. Both sides are reduced to letters and digits before comparison
   rather than required to match byte for byte.
   ──────────────────────────────────────────────────────────────────────── */

/** "ReSpo.Vision" → "respovision". Empty for a name with no alphanumerics. */
export function startupMatchKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * match-key → startup. The first record wins, so a duplicate row in the feed
 * cannot shadow the original.
 */
export function indexFtabr26Startups(startups: Ftabr26Startup[]): Map<string, Ftabr26Startup> {
  const index = new Map<string, Ftabr26Startup>();
  for (const s of startups) {
    const key = startupMatchKey(s.name);
    if (key && !index.has(key)) index.set(key, s);
  }
  return index;
}

/**
 * Startup records for a roster entry's keys, in the order given. A key that
 * matches nothing — the live table renamed or dropped the company — is skipped
 * rather than rendered as an empty card; callers handle the all-missing case.
 * The dev warning is how a rename surfaces before it reaches production.
 */
export function lookupFtabr26Startups(
  index: Map<string, Ftabr26Startup>,
  keys: readonly string[],
): Ftabr26Startup[] {
  const out: Ftabr26Startup[] = [];
  for (const key of keys) {
    const found = index.get(startupMatchKey(key));
    if (found) out.push(found);
    else if (process.env.NODE_ENV !== "production") console.warn(`[ftabr26] no startup record for roster key "${key}"`);
  }
  return out;
}

export function resolveFtabr26Startups(
  live: { startups?: Ftabr26Startup[] } | undefined,
): Ftabr26StartupsResolved {
  const rows = live?.startups;
  return rows && rows.length > 0
    ? { startups: rows, isLive: true }
    : { startups: FTABR26_STARTUPS, isLive: false };
}
