// @ts-nocheck
/* eslint-disable */
/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · Football Tech & Business Report 2026 — live facts wire format.

   Single source of truth for the shape of GET /api/report/ftabr26/facts,
   imported by the route handler, the report page and the PDF page.

   This exists because the older GSTER25 response shape is hand-redeclared in
   three places that have already drifted apart. Declare it once here instead.
   ──────────────────────────────────────────────────────────────────────── */

export type Ftabr26Period = {
  /** Inclusive window label, e.g. "2021 – H1 2026". */
  label: string;
  /** Trailing-window label, e.g. "2025 – H1 2026". */
  recentLabel: string;
  recentMonths: number;
  /** ISO dates describing the window the figures were computed over. */
  windowStart: string;
  /** Exclusive upper bound. */
  windowEndExclusive: string;
  recentStart: string;
};

/** Raw figures for the executive-summary cards. Formatting stays client-side. */
export type Ftabr26SummaryFacts = {
  totalMusd: number;
  /** Funding in the trailing partial half-year (the "H1 20XX" bucket). */
  latestHalfMusd: number;
  latestHalfLabel: string;
  dealCount: number;
  pctToFansAllTime: number;
  pctToFansRecent: number;
  /** Top region by funding, and the runner-up, so copy need not hardcode names. */
  topRegionName: string;
  topRegionMusd: number;
  secondRegionName: string;
  secondRegionMusd: number;
};

export type Ftabr26YearRow = {
  year: string;
  footballOnly: number;
  footballAlso: number;
  roundsOnly: number;
  roundsAlso: number;
};

export type Ftabr26RegionRow = {
  region: string;
  footballOnly: number;
  footballAlso: number;
  roundsOnly: number;
  roundsAlso: number;
};

export type Ftabr26SectorYearRow = {
  year: string;
  athletes: number;
  fans: number;
  executives: number;
};

export type Ftabr26SectorKey = 'athletes' | 'fans' | 'execs';

export type Ftabr26SectorShare = { label: string; pct: number; sector: Ftabr26SectorKey };

export type Ftabr26SubSectorShare = {
  label: string;
  pct: number;
  parent: Ftabr26SectorKey;
  funding?: number;
  rounds?: number;
};

export type Ftabr26LeaderRow = { rank: number; name: string; amount: number; rounds: number };

export type Ftabr26CompanyRow = {
  rank: number;
  name: string;
  description: string;
  city: string;
  country: string;
  funding: number;
  /** Carried through only so the table can resolve a logo; absent in the
      committed fallback rows, which then render a monogram. */
  website?: string;
};

/** Leaderboards are sliced by category (Football Only/Also) × recency. */
export type Ftabr26Leaderboard = {
  onlyAllTime: Ftabr26LeaderRow[];
  onlyRecent: Ftabr26LeaderRow[];
  alsoAllTime: Ftabr26LeaderRow[];
  alsoRecent: Ftabr26LeaderRow[];
};

export type Ftabr26Facts = {
  /** ISO timestamp the snapshot was computed, for the methodology block. */
  dataAsOf: string;
  /**
   * True when debt-financing rounds are filtered out, matching the
   * GSTER25 methodology (see DM_NO_DEBT in server/routes/report.ts).
   */
  excludesDebt: boolean;
  period: Ftabr26Period;
  summary: Ftabr26SummaryFacts;
  byYear: Ftabr26YearRow[];
  byRegion: Ftabr26RegionRow[];
  sectorByYear: Ftabr26SectorYearRow[];
  sectorShare: Ftabr26SectorShare[];
  sectorShareRecent: Ftabr26SectorShare[];
  subSectorShare: Ftabr26SubSectorShare[];
  topCountries: Ftabr26Leaderboard;
  topCities: Ftabr26Leaderboard;
  topCompaniesOnly: Ftabr26CompanyRow[];
  topCompaniesAlso: Ftabr26CompanyRow[];
};

/* ── Ecosystem (initiatives / programs / events) ──────────────────────────
   Rows flagged `in_ftabr26` in initiatives_master, programs_master and
   events_master. The report renders a logo per row, resolved client-side
   from `website` — the master tables carry no logo column.
   ──────────────────────────────────────────────────────────────────────── */

export type Ftabr26EcosystemEntry = {
  rank: number;
  name: string;
  /** Raw value from the master table; may lack a scheme. */
  website: string | null;
  city: string | null;
  country: string | null;
  /** Raw value from the master table; blank on a handful of rows, where the
      ecosystem map falls back to the country. */
  continent: string | null;
  /** Events only — ISO date, formatted as "Mmm YY" by the report. */
  startDate?: string | null;
};

export type Ftabr26Ecosystem = {
  initiatives: Ftabr26EcosystemEntry[];
  programs: Ftabr26EcosystemEntry[];
  events: Ftabr26EcosystemEntry[];
};

/* ── Startups to watch ────────────────────────────────────────────────────
   Rows flagged `in_ftabr26` in sm_test. The report renders one card per
   company; `logoUrl` is the uploaded override when the company has one, and
   is otherwise null so the client can resolve a logo from `website`.
   ──────────────────────────────────────────────────────────────────────── */

export type Ftabr26StartupSector = "athletes" | "fans" | "execs";

export type Ftabr26Startup = {
  name: string;
  /** Raw value from sm_test; may lack a scheme. */
  website: string | null;
  country: string | null;
  description: string | null;
  /** Mapped from the STX top-level sector; null when it is unset or unknown. */
  sector: Ftabr26StartupSector | null;
  /** custom_logo_url when set, else null — the client falls back to logo.dev. */
  logoUrl: string | null;
};
