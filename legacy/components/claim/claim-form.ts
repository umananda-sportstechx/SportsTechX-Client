import type { ClaimRole } from '@/lib/claim-events';

// ─── Option sets (mirror ui_design/app/claim-modal.jsx) ──────────────────
export const FUND_ROUND_NAMES = ['Angel Round', 'Convertible Note', 'Corporate Round', 'Debt Financing', 'Early Stage Venture', 'Equity Crowdfunding', 'Funding Round', 'Grant', 'Late Stage Venture', 'Pre Seed Round', 'Private Equity', 'Seed Round', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Venture Debt', 'Venture Round'];
export const BIZ_MODELS = ['B2C', 'B2B', 'B2B2C', 'D2C', 'Marketplace', 'SaaS', 'Hardware', 'Other'];
export const SPORTS_LIST = ['Motorsports', 'Football', 'Soccer', 'Basketball', 'Tennis', 'Baseball', 'Cricket', 'Golf', 'Rugby', 'Esports', 'Multi-sport', 'Other'];
export const RAISE_AMOUNTS = ['$50K', '$100K', '$250K', '$500K', '$1M', '$2M', '$5M', '$10M', '$25M', '$50M', '$100M', '$250M+'];
export const INV_TYPES = ['VC', 'PE', 'CVC', 'Angel / Syndicate', 'Family Office', 'Accelerator', 'Corporate'];
export const OP_TYPES = ['Accelerator', 'Incubator', 'Initiative / Challenge', 'Event / Conference', 'Federation / League', 'Venue / Facility'];
export const INV_CATEGORIES = ['Venture Capital', 'Private Equity', 'Corporate VC', 'Angel / Syndicate', 'Family Office', 'Accelerator', 'Corporate', 'Sovereign Fund', 'Other'];
export const CONTINENTS = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania', 'Middle East'];
export const THESIS_SECTORS = ['For Athletes', 'For Fans', 'For Execs', 'Performance', 'Media & Streaming', 'Fan Engagement', 'Wearables & Gear', 'Esports'];
export const TECH_PREFS = ['AI / ML', 'Hardware', 'Wearables', 'Analytics', 'Streaming', 'Marketplace', 'SaaS', 'Web3', 'Computer Vision', 'Mobile'];
export const FUNDING_STAGES = ['Angel', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Venture (Unknown Stage)', 'Private Equity'];
export const REVENUE_STAGES = ['Pre-Revenue', 'Early Revenue', 'Product-Market Fit', 'Scaling', 'Late Stage'];

// Operator op_type → backend ecosystem_entity_type enum.
export const OP_TYPE_TO_ENTITY: Record<string, 'organization' | 'initiative' | 'program' | 'event'> = {
  Accelerator: 'program',
  Incubator: 'program',
  'Initiative / Challenge': 'initiative',
  'Event / Conference': 'event',
  'Federation / League': 'organization',
  'Venue / Facility': 'organization',
};

export interface RoundRow { roundType: string; amount: string; date: string; investors: string; source: string }
export interface MnaRow { dealType: string; counterparty: string; amount: string; date: string }
export interface FundRow { name: string; year: string; size: string }
export interface PortfolioRow { name: string; stage: string; year: string }

export interface ClaimForm {
  // identity
  first: string; last: string; city: string; country: string; email: string; position: string; linkedin: string;
  // entity basics
  name: string; website: string; description: string; sector: string; businessModel: string;
  founded: string; coCity: string; coCountry: string; sport: string; programs: string;
  // founder funding + M&A
  rounds: RoundRow[]; mna: MnaRow[];
  // contact + social
  twitter: string; instagram: string; facebook: string; linkedin_co: string; companyEmail: string;
  contactFirst: string; contactLast: string; contactPosition: string; contactEmail: string; contactLinkedin: string;
  // fundraising (founder)
  raising: boolean; raiseMin: string; raiseMax: string; roundNames: string[]; valuation: string;
  deckFile: File | null; deckName: string | null;
  // investor
  invType: string; aum: string; focus: string;
  invCategory: string; yearLaunched: string; funds: FundRow[]; contactName: string;
  buildThesis: boolean; continents: string[]; thesisSectors: string[]; techPrefs: string[];
  minInv: string; maxInv: string; fundingStages: string[]; revenueStages: string[]; portfolio: PortfolioRow[];
  // operator
  opType: string; appsOpen: boolean; intake: string; keyDate: string; offer: string;
}

export interface SelectedEntity {
  id?: string | null;
  name: string;
  website?: string | null;
  hq?: string | null;
  cc?: string | null;
  verified?: boolean;
}

export function blankClaimForm(item?: SelectedEntity | null): ClaimForm {
  return {
    first: '', last: '', city: '', country: '', email: '', position: '', linkedin: '',
    name: item?.name ?? '',
    website: item?.website ? item.website.replace(/^https?:\/\//, '') : '',
    description: '', sector: '', businessModel: 'B2B', founded: '',
    coCity: item?.hq ?? '', coCountry: item?.cc ?? '', sport: '', programs: '',
    rounds: [], mna: [],
    twitter: '', instagram: '', facebook: '', linkedin_co: '', companyEmail: '',
    contactFirst: '', contactLast: '', contactPosition: '', contactEmail: '', contactLinkedin: '',
    raising: false, raiseMin: '', raiseMax: '', roundNames: [], valuation: '', deckFile: null, deckName: null,
    invType: 'VC', aum: '', focus: '',
    invCategory: '', yearLaunched: '', funds: [], contactName: '',
    buildThesis: false, continents: [], thesisSectors: [], techPrefs: [],
    minInv: '', maxInv: '', fundingStages: [], revenueStages: [], portfolio: [],
    opType: item?.id ? 'Accelerator' : 'Accelerator', appsOpen: true, intake: '', keyDate: '', offer: '',
  };
}

export interface RoleStep { k: string; label: string; next?: string }
export interface RoleConfig {
  id: ClaimRole;
  label: string;
  icon: 'building' | 'wallet' | 'zap';
  free: boolean;
  chooserDesc: string;
  noun: string;
  searchPlaceholder: string;
  railLead: (name: string) => string;
  bonusTag: string;
  bonus: string[];
  steps: RoleStep[];
  submitClaim: string;
  submitAdd: string;
}

export const CM_ROLES: Record<ClaimRole, RoleConfig> = {
  founder: {
    id: 'founder', label: 'Founder', icon: 'building', free: true,
    chooserDesc: 'Claim a company you work at or run.',
    noun: 'company', searchPlaceholder: 'e.g. Teamworks, Hoopers, your startup…',
    railLead: (name) => `Verify ${name || 'your company'} so the funding, stage and contact details investors see are the ones you control — not a guess.`,
    bonusTag: 'Free bonus when verified',
    bonus: ['A free Locker Room Report on your competitive set', '30 days of Growth access — investors, programs & events', 'A verified badge investors can trust'],
    steps: [
      { k: 'identity', label: 'Your details', next: 'Next: Data edits' },
      { k: 'dataedits', label: 'Company data', next: 'Next: Fundraising' },
      { k: 'fundraising', label: 'Fundraising', next: 'Review & Submit' },
      { k: 'review', label: 'Review' },
    ],
    submitClaim: 'Submit for verification', submitAdd: 'Submit for verification',
  },
  investor: {
    id: 'investor', label: 'Investor', icon: 'wallet', free: false,
    chooserDesc: 'Claim a fund, CVC, angel or syndicate.',
    noun: 'firm', searchPlaceholder: 'e.g. Courtside Ventures, Sapphire Sport…',
    railLead: (name) => `Claim ${name || 'your firm'} to manage your thesis, focus and fund details — and get the founders actively raising in front of you first.`,
    bonusTag: 'What you unlock',
    bonus: ['A claimed, managed investor profile', 'Inbound deal flow from companies actively raising', 'Your thesis & cheque size shown to relevant founders'],
    steps: [
      { k: 'identity', label: 'Your details', next: 'Next: Edit data' },
      { k: 'invdata', label: 'Investor data', next: 'Next: Portfolio' },
      { k: 'portfolio', label: 'Portfolio' },
    ],
    submitClaim: 'Submit claim', submitAdd: 'Submit firm',
  },
  operator: {
    id: 'operator', label: 'Operator', icon: 'zap', free: false,
    chooserDesc: 'Claim an accelerator, programme, initiative or event.',
    noun: 'program', searchPlaceholder: 'e.g. Stadia Ventures, SBJ Tech Week…',
    railLead: (name) => `Claim ${name || 'your program'} to keep your cohorts, dates and deadlines current — and reach the founders looking for exactly what you run.`,
    bonusTag: 'What you unlock',
    bonus: ['A claimed profile for your program or event', 'Applications & signups from relevant founders', 'Your intakes, dates and deadlines kept current'],
    steps: [
      { k: 'identity', label: 'About you' },
      { k: 'details', label: 'Details' },
      { k: 'extra', label: 'Applications' },
    ],
    submitClaim: 'Submit claim', submitAdd: 'Submit listing',
  },
};

export const CM_ROLE_LIST = [CM_ROLES.founder, CM_ROLES.investor, CM_ROLES.operator];
