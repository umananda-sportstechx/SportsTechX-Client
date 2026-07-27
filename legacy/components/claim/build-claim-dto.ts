import { getSupabaseBrowser } from '@/lib/supabase/client';
import type { ClaimForm } from './claim-form';
import { OP_TYPE_TO_ENTITY } from './claim-form';
import type { ClaimReference } from './use-claim-reference';

// ─── value parsers ───────────────────────────────────────────────────────

/** Parse a "$50K" / "$1M" / "$250M+" label (or a raw digit string) to a USD number. */
export function parseAmount(label: string): number | null {
  if (!label) return null;
  const cleaned = label.replace(/[$,+\s]/g, '').toUpperCase();
  const m = cleaned.match(/^([\d.]+)([KMB]?)$/);
  if (!m) {
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : m[2] === 'B' ? 1e9 : 1;
  return n * mult;
}

const REVENUE_STAGE_MAP: Record<string, 'pre_revenue' | 'early_revenue' | 'growth' | 'profitable' | 'other'> = {
  'Pre-Revenue': 'pre_revenue',
  'Early Revenue': 'early_revenue',
  'Product-Market Fit': 'growth',
  'Scaling': 'growth',
  'Late Stage': 'profitable',
};
function mapRevenueStages(labels: string[]): string[] {
  return Array.from(new Set(labels.map((l) => REVENUE_STAGE_MAP[l]).filter(Boolean)));
}

const intOrNull = (s: string): number | null => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};
const trimOrNull = (s: string): string | null => {
  const v = s.trim();
  return v ? v : null;
};

// ─── pitch-deck upload ─────────────────────────────────────────────────────

/**
 * Uploads a pitch deck to the private `claim-decks` bucket under the user's own
 * folder (RLS enforces `<uid>/...`). Returns the storage object path stored in
 * `pitch_deck_url`; admins mint signed URLs to read it. Throws on failure.
 */
export async function uploadPitchDeck(file: File, userId: string): Promise<string> {
  const supabase = getSupabaseBrowser();
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
  const key = `${userId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from('claim-decks').upload(key, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return key;
}

// ─── DTO builders ──────────────────────────────────────────────────────────
// Each maps the rich wizard form to the matching /api/claims/* payload. We send
// only keys the strict server schema accepts; reference labels are resolved to
// uuids via `ref`. The selected entity id (when claiming an existing record)
// becomes target_*_id; otherwise the backend files it as a new-entry request.

export function buildCompanyDto(form: ClaimForm, ref: ClaimReference, targetId: string | null, deckPath: string | null) {
  return {
    company_email: form.email.trim(),
    position_at_company: form.position.trim() || 'Founder',
    target_company_id: targetId,
    target_name_snapshot: form.name.trim(),
    target_website_snapshot: trimOrNull(form.website),
    details: {
      actively_raising: form.raising,
      round_type_id: ref.resolveRoundType(form.roundNames[0]) ?? null,
      raising_amount_min_usd: parseAmount(form.raiseMin),
      raising_amount_max_usd: parseAmount(form.raiseMax),
      raising_valuation_note: trimOrNull(form.valuation),
      pitch_deck_url: deckPath,
      round_names: form.roundNames,
      description: trimOrNull(form.description),
      sector_id: ref.resolveSector(form.sector),
      business_model: trimOrNull(form.businessModel),
      founded_year: intOrNull(form.founded),
      hq_city: trimOrNull(form.coCity),
      hq_country: trimOrNull(form.coCountry),
      sport: trimOrNull(form.sport),
      program_participation: trimOrNull(form.programs),
      twitter_url: trimOrNull(form.twitter),
      instagram_url: trimOrNull(form.instagram),
      facebook_url: trimOrNull(form.facebook),
      linkedin_url: trimOrNull(form.linkedin_co),
      public_email: trimOrNull(form.companyEmail),
      contact_first_name: trimOrNull(form.contactFirst),
      contact_last_name: trimOrNull(form.contactLast),
      contact_position: trimOrNull(form.contactPosition),
      contact_email: trimOrNull(form.contactEmail),
      contact_linkedin: trimOrNull(form.contactLinkedin),
    },
    funding_rounds: form.rounds.map((r) => ({
      round_type_id: ref.resolveRoundType(r.roundType),
      round_label: trimOrNull(r.roundType),
      amount_usd: parseAmount(r.amount),
      round_date: trimOrNull(r.date),
      investors: trimOrNull(r.investors),
      source_url: trimOrNull(r.source),
    })),
    mna: form.mna.map((m) => ({
      deal_type: trimOrNull(m.dealType),
      counterparty: trimOrNull(m.counterparty),
      amount_usd: parseAmount(m.amount),
      deal_date: trimOrNull(m.date),
    })),
  };
}

export function buildInvestorDto(form: ClaimForm, ref: ClaimReference, targetId: string | null) {
  return {
    company_email: form.email.trim(),
    position_at_company: form.position.trim() || 'Partner',
    target_investor_id: targetId,
    target_name_snapshot: form.name.trim(),
    target_website_snapshot: trimOrNull(form.website),
    details: {
      actively_investing: true,
      thesis_amount_min_usd: parseAmount(form.minInv),
      thesis_amount_max_usd: parseAmount(form.maxInv),
      fund_data: form.aum || form.focus ? { aum: form.aum || null, focus: form.focus || null } : null,
      category: trimOrNull(form.invCategory),
      year_launched: intOrNull(form.yearLaunched),
      description: trimOrNull(form.description),
      hq_city: trimOrNull(form.coCity),
      hq_country: trimOrNull(form.coCountry),
      twitter_url: trimOrNull(form.twitter),
      instagram_url: trimOrNull(form.instagram),
      facebook_url: trimOrNull(form.facebook),
      linkedin_url: trimOrNull(form.linkedin_co),
      public_email: trimOrNull(form.companyEmail),
      contact_name: trimOrNull(form.contactName),
      contact_position: trimOrNull(form.contactPosition),
      contact_email: trimOrNull(form.contactEmail),
      contact_linkedin: trimOrNull(form.contactLinkedin),
    },
    thesis_sectors: ref.resolveSectors(form.thesisSectors),
    thesis_tech_tags: ref.resolveTechTags(form.techPrefs),
    thesis_revenue_stages: mapRevenueStages(form.revenueStages),
    thesis_continents: form.continents,
    thesis_funding_stages: form.fundingStages,
    funds: form.funds.map((f) => ({
      name: trimOrNull(f.name),
      fund_year: intOrNull(f.year),
      size_usd: parseAmount(f.size),
    })),
    portfolio: form.portfolio.map((p) => ({
      company_name: trimOrNull(p.name),
      stage: trimOrNull(p.stage),
      invest_year: intOrNull(p.year),
    })),
  };
}

export function buildEntityDto(form: ClaimForm, targetId: string | null) {
  return {
    company_email: form.email.trim(),
    position_at_company: form.position.trim() || 'Organiser',
    target_ecosystem_entity_id: targetId,
    target_name_snapshot: form.name.trim(),
    target_website_snapshot: trimOrNull(form.website),
    details: {
      entity_type: OP_TYPE_TO_ENTITY[form.opType] ?? 'organization',
      op_type: trimOrNull(form.opType),
      description: trimOrNull(form.description),
      location: trimOrNull(form.coCity),
      country: trimOrNull(form.coCountry),
      applications_open: form.appsOpen,
      next_intake: trimOrNull(form.intake),
      key_date: trimOrNull(form.keyDate),
      offer: trimOrNull(form.offer),
    },
  };
}
