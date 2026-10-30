// @ts-nocheck
/* eslint-disable */
/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · Football Tech & Business Report 2026 — FALLBACK SNAPSHOT

   The live figures come from GET /api/report/ftabr26/facts. The numeric
   constants below are the offline fallback, served field-by-field by
   client/src/lib/ftabr26-live.ts when that endpoint is unavailable or
   returns a partial payload. Regenerated from GET /api/report/ftabr26/facts
   on 2026-09-10, so the offline path shows the same 2021 – H1 2026 window the
   *_NOTE strings below describe. Regenerate again whenever the window moves.

   The Dealflow commentary is generated from the same resolved facts as the
   charts and leaderboards (client/src/lib/ftabr26-dealflow-copy.ts).

   Terminology used throughout (source p33, Methodology):
     · "Football Only"  — startups built solely for the football ecosystem
     · "Football Also"  — multisport startups serving football alongside
                          other sports
   ──────────────────────────────────────────────────────────────────────── */

export const FTABR26_PERIOD = {
  /** Inclusive window the placeholder data covers. */
  label: "2021 – H1 2026",
  recentLabel: "2025 – H1 2026",
  recentMonths: 18,
} as const;

/* ── Executive summary (source p5) ──────────────────────────────────────── */

export type SummaryStat = { num: string; label: string; subtitle?: string };

/* Regenerated from GET /api/report/ftabr26/facts on 2026-09-01, so the cover
   no longer flashes FTR25 figures before the endpoint answers. Cards 4 and 6
   are counted from the content arrays at runtime; their nums here only matter
   in the offline path. */
export const FTABR26_SUMMARY: SummaryStat[] = [
  { num: "$8.1B", label: "Global football tech dealflow", subtitle: "Since 2021, incl. $476.0M in H1 2026 alone" },
  { num: "77.0%", label: "Of funding to fans & content", subtitle: "Up from 68.0% across the full period" },
  { num: "$5.4B", label: "Raised in Europe",             subtitle: "North America next with $2.5B" },
  { num: "10",    label: "Trends in football innovation", subtitle: "Plus women's football and World Cup 26" },
  { num: "20",    label: "Innovation initiatives",        subtitle: "By teams, leagues and federations" },
  { num: "15",    label: "Football tech innovators",      subtitle: "Interviewed for this edition" },
];

/* ── Investment by year (source p10) ────────────────────────────────────── */

export type YearRow = {
  year: string;
  footballOnly: number;   // $M
  footballAlso: number;   // $M
  roundsOnly: number;
  roundsAlso: number;
};

export const FTABR26_BY_YEAR: YearRow[] = [
  { year: "2021",      footballOnly:  922.6, footballAlso:  929.3, roundsOnly: 46, roundsAlso: 41 },
  { year: "2022",      footballOnly:  521.1, footballAlso:  948.3, roundsOnly: 43, roundsAlso: 28 },
  { year: "2023",      footballOnly:  204.2, footballAlso:  198.6, roundsOnly: 19, roundsAlso: 15 },
  { year: "2024",      footballOnly:  159.7, footballAlso:  831.6, roundsOnly: 26, roundsAlso: 22 },
  { year: "2025",      footballOnly:  120.0, footballAlso: 2777.3, roundsOnly: 18, roundsAlso: 25 },
  { year: "H1 2026",   footballOnly:   33.3, footballAlso:  442.6, roundsOnly: 12, roundsAlso: 10 },
];

/* ── Investment by region (source p11) ──────────────────────────────────── */

export type RegionRow = {
  region: string;
  footballOnly: number;
  footballAlso: number;
  roundsOnly: number;
  roundsAlso: number;
};

export const FTABR26_BY_REGION: RegionRow[] = [
  { region: "Europe",        footballOnly: 1627.3, footballAlso: 3759.2, roundsOnly: 111, roundsAlso: 66 },
  { region: "North America", footballOnly:  304.8, footballAlso: 2193.6, roundsOnly:  27, roundsAlso: 55 },
  { region: "Asia-Pacific",  footballOnly:   13.0, footballAlso:  171.6, roundsOnly:  19, roundsAlso: 17 },
  { region: "South America", footballOnly:   11.9, footballAlso:    3.2, roundsOnly:   5, roundsAlso:  3 },
  { region: "Africa",        footballOnly:    4.0, footballAlso:    0.0, roundsOnly:   2, roundsAlso:  0 },
];

/* ── Sector split (source p12) ──────────────────────────────────────────── */

export type SectorYearRow = {
  year: string;
  athletes: number;   // For Athletes ($M)
  fans: number;       // For Fans ($M)
  executives: number; // For Executives ($M)
};

export const FTABR26_SECTOR_BY_YEAR: SectorYearRow[] = [
  { year: "2021",      athletes:  135.9, fans: 1199.2, executives:  516.8 },
  { year: "2022",      athletes:  281.0, fans:  773.6, executives:  414.8 },
  { year: "2023",      athletes:   26.5, fans:  218.0, executives:  158.3 },
  { year: "2024",      athletes:  168.5, fans:  744.4, executives:   78.3 },
  { year: "2025",      athletes:  112.3, fans: 2463.7, executives:  321.3 },
  { year: "H1 2026",   athletes:  302.0, fans:  132.5, executives:   41.4 },
];

export type SectorShare = { label: string; pct: number; sector: "athletes" | "fans" | "execs" };

/** Funding per sector, full period (source p12). */
export const FTABR26_SECTOR_SHARE: SectorShare[] = [
  { label: "Fans & Content",            pct: 68.4, sector: "fans" },
  { label: "Management & Organisation", pct: 18.9, sector: "execs" },
  { label: "Activity & Performance",    pct: 12.7, sector: "athletes" },
];

/** Funding per sector, last 18 months (source p12). */
export const FTABR26_SECTOR_SHARE_RECENT: SectorShare[] = [
  { label: "Fans & Content",            pct: 77.0, sector: "fans" },
  { label: "Activity & Performance",    pct: 12.3, sector: "athletes" },
  { label: "Management & Organisation", pct: 10.8, sector: "execs" },
];

export type SubSectorShare = {
  label: string;
  pct: number;
  parent: "fans" | "execs" | "athletes";
  funding?: number;
  rounds?: number;
};

/** Funding per sub-sector, full period (source p12). */
export const FTABR26_SUB_SECTOR_SHARE: SubSectorShare[] = [
  { label: "Content Platforms",        pct: 41.3, parent: "fans", funding: 3340, rounds: 28 },
  { label: "Fantasy Sports & Betting", pct: 13.6, parent: "fans" },
  { label: "Fan Experiences",          pct: 13.5, parent: "fans", funding: 1090, rounds: 50 },
  { label: "Organisations & Venues",   pct: 11.7, parent: "execs" },
  { label: "Media & Sponsors",         pct:  7.3, parent: "execs" },
  { label: "For Activity: Software",   pct:  6.0, parent: "athletes" },
  { label: "For Activity: Hardware",   pct:  4.8, parent: "athletes" },
  { label: "Before / After Activity",  pct:  1.9, parent: "athletes" },
];

/* ── Leaderboards: countries & cities (source pp13–14) ──────────────────── */

export type LeaderRow = { rank: number; name: string; amount: number; rounds: number };

export const FTABR26_TOP_COUNTRIES = {
  onlyAllTime: [
    { rank:  1, name: "France",      amount: 793.9, rounds:  8 },
    { rank:  2, name: "Germany",     amount: 435.2, rounds: 13 },
    { rank:  3, name: "USA",         amount: 267.6, rounds: 24 },
    { rank:  4, name: "Spain",       amount: 146.7, rounds: 13 },
    { rank:  5, name: "UK",          amount: 118.9, rounds: 28 },
    { rank:  6, name: "Portugal",    amount:  43.8, rounds: 10 },
    { rank:  7, name: "Mexico",      amount:  37.2, rounds:  3 },
    { rank:  8, name: "Sweden",      amount:  35.0, rounds:  2 },
    { rank:  9, name: "Switzerland", amount:  12.1, rounds:  5 },
    { rank: 10, name: "Brazil",      amount:  11.3, rounds:  3 },
  ] as LeaderRow[],
  onlyRecent: [
    { rank:  1, name: "France",      amount: 60.0, rounds:  1 },
    { rank:  2, name: "USA",         amount: 40.6, rounds:  6 },
    { rank:  3, name: "UK",          amount: 19.5, rounds:  6 },
    { rank:  4, name: "Portugal",    amount: 13.0, rounds:  2 },
    { rank:  5, name: "Switzerland", amount:  8.2, rounds:  1 },
    { rank:  6, name: "Poland",      amount:  6.1, rounds:  2 },
    { rank:  7, name: "Lithuania",   amount:  2.0, rounds:  1 },
    { rank:  8, name: "India",       amount:  1.6, rounds:  2 },
    { rank:  9, name: "Spain",       amount:  1.2, rounds:  2 },
    { rank: 10, name: "Germany",     amount:  1.0, rounds:  2 },
  ] as LeaderRow[],
  alsoAllTime: [
    { rank:  1, name: "UK",      amount: 3001.2, rounds: 20 },
    { rank:  2, name: "USA",     amount: 2002.3, rounds: 51 },
    { rank:  3, name: "Israel",  amount:  276.0, rounds:  4 },
    { rank:  4, name: "Canada",  amount:  191.2, rounds:  4 },
    { rank:  5, name: "Germany", amount:  139.5, rounds:  3 },
    { rank:  6, name: "India",   amount:  129.8, rounds: 12 },
    { rank:  7, name: "Denmark", amount:  105.0, rounds:  2 },
    { rank:  8, name: "Sweden",  amount:   81.3, rounds:  7 },
    { rank:  9, name: "Ireland", amount:   56.8, rounds:  2 },
    { rank: 10, name: "UAE",     amount:   40.3, rounds:  4 },
  ] as LeaderRow[],
  alsoRecent: [
    { rank:  1, name: "UK",      amount: 2452.8, rounds:  8 },
    { rank:  2, name: "USA",     amount:  687.4, rounds: 14 },
    { rank:  3, name: "UAE",     amount:   26.3, rounds:  2 },
    { rank:  4, name: "Sweden",  amount:   24.2, rounds:  2 },
    { rank:  5, name: "Israel",  amount:   15.0, rounds:  1 },
    { rank:  6, name: "Ireland", amount:    4.8, rounds:  1 },
    { rank:  7, name: "India",   amount:    4.6, rounds:  2 },
    { rank:  8, name: "France",  amount:    2.8, rounds:  1 },
    { rank:  9, name: "Italy",   amount:    2.0, rounds:  1 },
    { rank: 10, name: "Germany", amount:    0.0, rounds:  1 },
  ] as LeaderRow[],
};

export const FTABR26_TOP_CITIES = {
  onlyAllTime: [
    { rank:  1, name: "Paris",       amount: 793.9, rounds:  8 },
    { rank:  2, name: "Berlin",      amount: 421.9, rounds:  2 },
    { rank:  3, name: "Costa Mesa",  amount: 158.1, rounds:  8 },
    { rank:  4, name: "Barcelona",   amount: 146.0, rounds:  8 },
    { rank:  5, name: "London",      amount:  52.3, rounds:  9 },
    { rank:  6, name: "Austin",      amount:  47.0, rounds:  1 },
    { rank:  7, name: "Lisbon",      amount:  41.6, rounds:  9 },
    { rank:  8, name: "Manchester",  amount:  39.3, rounds:  7 },
    { rank:  9, name: "Mexico City", amount:  37.2, rounds:  3 },
    { rank: 10, name: "Stockholm",   amount:  35.0, rounds:  2 },
  ] as LeaderRow[],
  onlyRecent: [
    { rank:  1, name: "Paris",         amount: 60.0, rounds:  1 },
    { rank:  2, name: "Costa Mesa",    amount: 18.1, rounds:  2 },
    { rank:  3, name: "New York City", amount: 16.2, rounds:  2 },
    { rank:  4, name: "Lisbon",        amount: 13.0, rounds:  2 },
    { rank:  5, name: "Belfast",       amount: 12.2, rounds:  1 },
    { rank:  6, name: "Zurich",        amount:  8.2, rounds:  1 },
    { rank:  7, name: "Warsaw",        amount:  6.1, rounds:  2 },
    { rank:  8, name: "Seattle",       amount:  6.0, rounds:  1 },
    { rank:  9, name: "London",        amount:  4.8, rounds:  3 },
    { rank: 10, name: "Liverpool",     amount:  2.0, rounds:  1 },
  ] as LeaderRow[],
  alsoAllTime: [
    { rank:  1, name: "London",        amount: 2980.5, rounds: 15 },
    { rank:  2, name: "New York City", amount:  698.7, rounds: 11 },
    { rank:  3, name: "Los Angeles",   amount:  403.0, rounds:  5 },
    { rank:  4, name: "Durham",        amount:  350.0, rounds:  4 },
    { rank:  5, name: "Chicago",       amount:  275.0, rounds:  1 },
    { rank:  6, name: "Toronto",       amount:  190.2, rounds:  3 },
    { rank:  7, name: "Petah Tikva",   amount:  176.0, rounds:  2 },
    { rank:  8, name: "Munich",        amount:  130.0, rounds:  2 },
    { rank:  9, name: "Copenhagen",    amount:  105.0, rounds:  2 },
    { rank: 10, name: "Mumbai",        amount:  104.4, rounds:  5 },
  ] as LeaderRow[],
  alsoRecent: [
    { rank:  1, name: "London",        amount: 2440.8, rounds:  6 },
    { rank:  2, name: "Chicago",       amount:  275.0, rounds:  1 },
    { rank:  3, name: "Durham",        amount:  235.0, rounds:  2 },
    { rank:  4, name: "Los Angeles",   amount:  123.0, rounds:  3 },
    { rank:  5, name: "Dubai",         amount:   26.3, rounds:  2 },
    { rank:  6, name: "Stockholm",     amount:   24.2, rounds:  2 },
    { rank:  7, name: "San Francisco", amount:   22.0, rounds:  1 },
    { rank:  8, name: "Philadelphia",  amount:   20.0, rounds:  2 },
    { rank:  9, name: "Petah Tikva",   amount:   15.0, rounds:  1 },
    { rank: 10, name: "Edinburgh",     amount:   12.0, rounds:  2 },
  ] as LeaderRow[],
};

/* ── Leaderboards: companies (source pp15–16) ───────────────────────────── */

export type CompanyRow = {
  rank: number;
  name: string;
  description: string;
  city: string;
  country: string;
  funding: number; // $M
};

export const FTABR26_TOP_COMPANIES_ONLY: CompanyRow[] = [
  { rank:  1, name: "Sorare",                  description: "Digital collectibles",                                 city: "Paris",       country: "France",  funding:  728.4 },
  { rank:  2, name: "Onefootball",             description: "Football Media Platform",                              city: "Berlin",      country: "Germany", funding:  421.9 },
  { rank:  3, name: "TOCA Football",           description: "Smart football equipment",                             city: "Costa Mesa",  country: "USA",     funding:  158.1 },
  { rank:  4, name: "Barca Vision",            description: "Created to bring FC Barcelona fans across the world…", city: "Barcelona",   country: "Spain",   funding:  132.0 },
  { rank:  5, name: "Skill Corner",            description: "Data collection and analysis",                         city: "Paris",       country: "France",  funding:   60.0 },
  { rank:  6, name: "TraceUp",                 description: "Highlights capturing platform",                        city: "Austin",      country: "USA",     funding:   47.0 },
  { rank:  7, name: "Playermaker",             description: "Football performance tracker",                         city: "London",      country: "UK",      funding:   42.8 },
  { rank:  8, name: "Classic Football Shirts", description: "Platform to buy and sell football jerseys and other…", city: "Manchester",  country: "UK",      funding:   38.5 },
  { rank:  9, name: "Draftea",                 description: "Draftea is the first daily fantasy sports (DFS) pla…", city: "Mexico City", country: "Mexico",  funding:   37.2 },
  { rank: 10, name: "Goals",                   description: "Goals is a provider of an online football game and…",  city: "Stockholm",   country: "Sweden",  funding:   35.0 },
];

export const FTABR26_TOP_COMPANIES_ALSO: CompanyRow[] = [
  { rank:  1, name: "DAZN",          description: "OTT platform for sports",                              city: "London",        country: "UK",     funding: 2414.0 },
  { rank:  2, name: "Cosm",          description: "Cosm provides media technology solutions like scree…", city: "Los Angeles",   country: "USA",    funding:  350.0 },
  { rank:  3, name: "Teamworks",     description: "Athlete engagement platform",                          city: "Durham",        country: "USA",    funding:  350.0 },
  { rank:  4, name: "Genius Sports", description: "Suite of solutions for teams, leagues and federatio…", city: "London",        country: "UK",     funding:  330.0 },
  { rank:  5, name: "StatsPerform",  description: "Sports data platform",                                 city: "Chicago",       country: "USA",    funding:  275.0 },
  { rank:  6, name: "Tickpick",      description: "Ticketing platform",                                   city: "New York City", country: "USA",    funding:  250.0 },
  { rank:  7, name: "SeatGeek",      description: "Ticket search engine",                                 city: "New York City", country: "USA",    funding:  238.0 },
  { rank:  8, name: "theScore",      description: "Mobile first sports experiences through real-time n…", city: "Toronto",       country: "Canada", funding:  186.3 },
  { rank:  9, name: "Pixellot",      description: "Auto-production of sports events with multi-camera…",  city: "Petah Tikva",   country: "Israel", funding:  176.0 },
  { rank: 10, name: "Minute Media",  description: "Solutions for sports teams, brands and publishers",    city: "London",        country: "UK",     funding:  150.0 },
];

