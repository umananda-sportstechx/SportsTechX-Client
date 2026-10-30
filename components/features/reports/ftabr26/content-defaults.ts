// @ts-nocheck
/**
 * Every DB-editable block of the FTABR26 page and its default — the page renders
 * `reports.content.<key> ?? default`. The admin editor builds its forms from
 * these shapes (sent to it by /report-preview/ftabr26).
 *
 * The three data blocks (`facts`, `ecosystem`, `startups`) have no default here:
 * they hold the STX endpoints' payloads as stored with the report; when one is
 * missing the page falls back to the committed snapshots in ./data.
 */
import {
  FTABR26_HERO, FTABR26_ABOUT, FTABR26_INSIGHTS, FTABR26_CREATOR_DEALS, FTABR26_WOMENS_MCO_GROUPS,
  FTABR26_WORLDCUP, FTABR26_WORLDCUP_TECH_CATEGORIES, FTABR26_STARTUPS_NOTE, FTABR26_PARTNERS,
  FTABR26_METHODOLOGY, FTABR26_FEATURED,
} from './data/ftabr26-content-data';
import { FTABR26_INNOVATORS, FTABR26_PLAYMAKER_COMPANIES, FTABR26_QUESTIONS } from './data/ftabr26-innovators-data';
import { FTABR26_SOCCERMENT } from './data/ftabr26-soccerment-data';

export const FTABR26_DEFAULTS: Record<string, unknown> = {
  hero: FTABR26_HERO,
  about: FTABR26_ABOUT,
  insights: FTABR26_INSIGHTS,
  creatorDeals: FTABR26_CREATOR_DEALS,
  womensMcoGroups: FTABR26_WOMENS_MCO_GROUPS,
  worldcup: FTABR26_WORLDCUP,
  worldcupTechCategories: FTABR26_WORLDCUP_TECH_CATEGORIES,
  featured: FTABR26_FEATURED,
  soccerment: FTABR26_SOCCERMENT,
  questions: FTABR26_QUESTIONS,
  innovators: FTABR26_INNOVATORS,
  playmakerCompanies: FTABR26_PLAYMAKER_COMPANIES,
  startupsNote: FTABR26_STARTUPS_NOTE,
  partners: FTABR26_PARTNERS,
  methodology: FTABR26_METHODOLOGY,
};
