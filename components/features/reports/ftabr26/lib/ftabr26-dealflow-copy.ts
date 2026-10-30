// @ts-nocheck
/* eslint-disable */
import type { Ftabr26Resolved } from "./ftabr26-live";
import { formatFtabr26Money, formatFtabr26Percent, formatFtabr26Share } from "./ftabr26-format";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const money = formatFtabr26Money;
const percent = formatFtabr26Share;
const byName = <T extends { name: string }>(rows: T[], name: string) => rows.find(row => row.name === name);
const byLabel = <T extends { label: string }>(rows: T[], label: string) => rows.find(row => row.label === label);
const fundingTotal = (rows: { funding: number }[]) => sum(rows.map(row => row.funding));

export function buildFtabr26DealflowCopy(f: Ftabr26Resolved) {
  const years = f.byYear;
  const year = (label: string) => years.find(row => row.year === label);
  const y21 = year("2021");
  const y25 = year("2025");
  const h1 = years.find(row => row.year.startsWith("H1"));
  const y23 = year("2023");
  const y24 = year("2024");
  const footballOnlyYearAmounts = years
    .filter(row => Number(row.year) >= 2021 && Number(row.year) <= 2025)
    .map(row => money(row.footballOnly));
  const footballOnlyTrend = footballOnlyYearAmounts.length > 1
    ? `${footballOnlyYearAmounts[0]}, then ${footballOnlyYearAmounts.slice(1, -1).join(", ")} and ${footballOnlyYearAmounts.at(-1)}`
    : footballOnlyYearAmounts[0] ?? "$0.0M";
  const onlyTotal = sum(years.map(row => row.footballOnly));
  const alsoTotal = sum(years.map(row => row.footballAlso));
  const onlyRounds = sum(years.map(row => row.roundsOnly));
  const alsoRounds = sum(years.map(row => row.roundsAlso));
  const periodTotal = onlyTotal + alsoTotal;
  const allRounds = onlyRounds + alsoRounds;

  const regionTotals = f.byRegion
    .map(row => ({ ...row, total: row.footballOnly + row.footballAlso, rounds: row.roundsOnly + row.roundsAlso }))
    .sort((a, b) => b.total - a.total);
  const topRegion = regionTotals[0];
  const runnerUp = regionTotals[1];
  const asia = regionTotals.find(row => row.region === "Asia-Pacific");
  const southAmerica = regionTotals.find(row => row.region === "South America");
  const africa = regionTotals.find(row => row.region === "Africa");

  const fullFans = f.sectorShare.find(row => row.sector === "fans");
  const recentFans = f.sectorShareRecent.find(row => row.sector === "fans");
  const fullManagement = f.sectorShare.find(row => row.sector === "execs");
  const recentManagement = f.sectorShareRecent.find(row => row.sector === "execs");
  const fullAthletes = f.sectorShare.find(row => row.sector === "athletes");
  const recentAthletes = f.sectorShareRecent.find(row => row.sector === "athletes");
  const subSectors = [...f.subSectorShare].sort((a, b) => b.pct - a.pct);
  const topSubSector = subSectors[0];
  const nextThreeShare = sum(subSectors.slice(1, 4).map(row => row.pct));
  const dazn = byName(f.topCompaniesAlso, "DAZN");
  const company = (name: string) =>
    [...f.topCompaniesOnly, ...f.topCompaniesAlso].find(row => row.name === name);
  const contentPlatforms = byLabel(subSectors, "Content Platforms");
  const fanExperiences = byLabel(subSectors, "Fan Experiences");

  const countriesOnly = f.topCountries.onlyAllTime;
  const countriesAlso = f.topCountries.alsoAllTime;
  const countriesRecent = f.topCountries.alsoRecent;
  const citiesOnly = f.topCities.onlyAllTime;
  const citiesAlso = f.topCities.alsoAllTime;
  const citiesOnlyRecent = f.topCities.onlyRecent;
  const citiesAlsoRecent = f.topCities.alsoRecent;
  const citiesRecent = [...f.topCities.onlyRecent, ...f.topCities.alsoRecent]
    .sort((a, b) => b.amount - a.amount);
  const cityChicago = byName(citiesAlso, "Chicago");
  const cityDubai = byName(citiesAlsoRecent, "Dubai");
  const cityLisbon = byName(citiesOnlyRecent, "Lisbon");
  const cityBelfast = byName(citiesOnlyRecent, "Belfast");
  const countryUkRecent = byName(countriesRecent, "UK");
  const countryUsRecent = byName(countriesRecent, "USA");
  const recentOther = countriesRecent.filter(row => row.name !== "UK" && row.name !== "USA").sort((a, b) => b.amount - a.amount)[0];

  const companiesOnly = f.topCompaniesOnly;
  const companiesAlso = f.topCompaniesAlso;
  const onlyTopTen = fundingTotal(companiesOnly);
  const onlyTopTwo = fundingTotal(companiesOnly.slice(0, 2));
  const lowerOnlyNames = companiesOnly.slice(5).map(row => row.name);
  const daznShareTopTen = dazn?.funding ?? 0;
  const alsoTopTen = fundingTotal(companiesAlso);
  const tickpick = byName(companiesAlso, "Tickpick");
  const seatGeek = byName(companiesAlso, "SeatGeek");
  const londonNames = companiesAlso.filter(company => company.city === "London").length;
  const nyNames = companiesAlso.filter(company => company.city === "New York City").length;
  const ticketingTotal = (tickpick?.funding ?? 0) + (seatGeek?.funding ?? 0);

  const fmtAmountRounds = (row?: { amount: number; rounds: number }) =>
    row ? `${money(row.amount)} across ${row.rounds} rounds` : "not listed";
  const avg = (amount: number, rounds: number) => rounds ? money(amount / rounds) : "$0.0M";
  const subSectorActivity =
    fanExperiences?.rounds != null && contentPlatforms?.rounds != null &&
    fanExperiences.funding != null && contentPlatforms.funding != null
      ? `Deal counts run the other way: Fan Experiences is the busiest sub-sector in the data with ${fanExperiences.rounds} rounds for ${money(fanExperiences.funding)}, while Content Platforms needed ${contentPlatforms.rounds} to reach ${money(contentPlatforms.funding)}.`
      : `Deal counts run the other way: Fan Experiences leads sub-sector activity, while Content Platforms remains the largest funding pool.`;

  return {
    byYear:
      `'Football Only' funding has fallen every year since 2021: ${footballOnlyTrend}, with just ${money(h1?.footballOnly ?? 0)} in the first half of ${h1?.year.replace(/^H1 /, "") ?? "the latest year"}. ` +
      `Deal activity held up far better than the money: ${y21?.roundsOnly ?? 0} football-only rounds in 2021 against ${y25?.roundsOnly ?? 0} in 2025, while the average round shrank from ${avg(y21?.footballOnly ?? 0, y21?.roundsOnly ?? 0)} to ${avg(y25?.footballOnly ?? 0, y25?.roundsOnly ?? 0)}. Founders are still raising; the cheques got smaller. ` +
      `'Football Also' moved the other way, collapsing to ${money(y23?.footballAlso ?? 0)} in 2023 before rebounding to ${money(y24?.footballAlso ?? 0)} in 2024 and ${money(y25?.footballAlso ?? 0)} in 2025. Nearly a third of the period's funding came in that one year. ` +
      `Multisport startups now account for ${money(alsoTotal)} of the ${money(periodTotal)} total, raised across fewer rounds than their football-only counterparts (${alsoRounds} against ${onlyRounds}).`,
    byRegion:
      `${topRegion?.region ?? "Europe"} accounts for ${money(topRegion?.total ?? 0)} of the ${money(periodTotal)} total and is the only region with real depth on both sides of the split, with ${money(topRegion?.footballOnly ?? 0)} in 'Football Only' and ${money(topRegion?.footballAlso ?? 0)} in 'Football Also'. ` +
      `${runnerUp?.region ?? "North America"}'s ${money(runnerUp?.total ?? 0)} is overwhelmingly multisport: ${money(runnerUp?.footballAlso ?? 0)} 'Football Also' against just ${money(runnerUp?.footballOnly ?? 0)} for football-only startups. The two write cheques of much the same size, around ${avg(runnerUp?.total ?? 0, runnerUp?.rounds ?? 0)} on average. ` +
      `Everywhere else is a different business entirely: Asia-Pacific took ${money(asia?.total ?? 0)} across ${asia?.rounds ?? 0} rounds, South America ${money(southAmerica?.total ?? 0)} across ${southAmerica?.rounds ?? 0} and Africa ${money(africa?.total ?? 0)} across ${africa?.rounds ?? 0}. Asia-Pacific made up ${percent(asia?.rounds ?? 0, allRounds)} of every round in this report, but raised under 3.0% of the money.`,
    regionSplit:
      `The two columns say different things. ${topRegion?.region ?? "Europe"} takes ${percent(topRegion?.total ?? 0, periodTotal)} of the money from ${percent(topRegion?.rounds ?? 0, allRounds)} of the rounds and ${runnerUp?.region ?? "North America"} ${percent(runnerUp?.total ?? 0, periodTotal)} from ${percent(runnerUp?.rounds ?? 0, allRounds)}, so the money and the deal activity track each other in both. ` +
      `${asia?.region ?? "Asia-Pacific"} has the opposite profile: ${asia?.rounds ?? 0} rounds, or ${percent(asia?.rounds ?? 0, allRounds)} of everything transacted in this report, account for ${percent(asia?.total ?? 0, periodTotal)} of the money. Its average is ${avg(asia?.total ?? 0, asia?.rounds ?? 0)} a round, compared with ${avg(topRegion?.total ?? 0, topRegion?.rounds ?? 0)} in Europe. It is the most active region relative to its size and the least capitalised. South America and Africa barely register on either measure.`,
    sector:
      `${fullFans?.label ?? "Fans & Content"} took ${formatFtabr26Percent(fullFans?.pct ?? 0)} of football tech funding across the period and ${formatFtabr26Percent(recentFans?.pct ?? 0)} over the last 18 months. ` +
      `${topSubSector?.label ?? "Content Platforms"} alone is ${formatFtabr26Percent(topSubSector?.pct ?? 0)} of everything raised, almost all of it ${["DAZN", "Onefootball", "theScore", "Minute Media"].map(name => `${name} (${money(company(name)?.funding ?? 0)})`).join(", ")}. ` +
      `${fullManagement?.label ?? "Management & Organisation"} follows at ${formatFtabr26Percent(fullManagement?.pct ?? 0)} across the period but only ${formatFtabr26Percent(recentManagement?.pct ?? 0)} recently, slipping behind ${fullAthletes?.label ?? "Activity & Performance"} for the first time. ${fullAthletes?.label ?? "Activity & Performance"} holds steady at roughly ${formatFtabr26Percent(fullAthletes?.pct ?? 0)} in the full period and ${formatFtabr26Percent(recentAthletes?.pct ?? 0)} recently.`,
    sectorMix:
      `Set the two donuts side by side and the concentration is getting worse, not better: ${fullFans?.label ?? "Fans & Content"} climbs from ${formatFtabr26Percent(fullFans?.pct ?? 0)} to ${formatFtabr26Percent(recentFans?.pct ?? 0)}, and ${fullManagement?.label ?? "Management & Organisation"} falls from second place to third. ` +
      `The sub-sector column shows where that weight actually sits. ${topSubSector?.label ?? "Content Platforms"} accounts for ${formatFtabr26Percent(topSubSector?.pct ?? 0)} of everything raised, compared with ${formatFtabr26Percent(nextThreeShare)} for the next three sub-sectors together. DAZN on its own is ${percent(dazn?.funding ?? 0, periodTotal)} of every dollar in this report. ${subSectorActivity}`,
    countries:
      `${countriesOnly[0]?.name ?? "France"} leads football-only funding at ${money(countriesOnly[0]?.amount ?? 0)} from just ${countriesOnly[0]?.rounds ?? 0} rounds, almost entirely Sorare; ${countriesOnly[1]?.name ?? "Germany"}'s ${money(countriesOnly[1]?.amount ?? 0)} is similarly concentrated in Onefootball, and ${countriesOnly[3]?.name ?? "Spain"}'s ${money(countriesOnly[3]?.amount ?? 0)} is nearly all Barca Vision. ` +
      `The ${countriesOnly[2]?.name ?? "USA"} ranks third at ${money(countriesOnly[2]?.amount ?? 0)} but spreads it across ${countriesOnly[2]?.rounds ?? 0} rounds. The ${countriesOnly[4]?.name ?? "UK"} ranks fifth at ${money(countriesOnly[4]?.amount ?? 0)} from ${countriesOnly[4]?.rounds ?? 0} rounds, the most of any country, with an average of ${avg(countriesOnly[4]?.amount ?? 0, countriesOnly[4]?.rounds ?? 0)} a round. ` +
      `On the 'Football Also' side the ${countriesAlso[0]?.name ?? "UK"} dominates with ${money(countriesAlso[0]?.amount ?? 0)}, again on the strength of one company. Recent activity has narrowed further still: over the last 18 months the UK and US took ${money((countryUkRecent?.amount ?? 0) + (countryUsRecent?.amount ?? 0))} of multisport funding between them, against ${money(recentOther?.amount ?? 0)} for the next-largest market.`,
    cities:
      `At city level almost every hub reduces to a single company. ${citiesOnly[0]?.name ?? "Paris"} is Sorare (${money(citiesOnly[0]?.amount ?? 0)}), ${citiesOnly[1]?.name ?? "Berlin"} is Onefootball (${money(company("Onefootball")?.funding ?? citiesOnly[1]?.amount ?? 0)} from ${citiesOnly[1]?.rounds ?? 0} rounds), ${citiesOnly[2]?.name ?? "Costa Mesa"} is TOCA Football (${money(company("TOCA Football")?.funding ?? citiesOnly[2]?.amount ?? 0)}) and ${citiesOnly[3]?.name ?? "Barcelona"} is Barca Vision (${money(company("Barca Vision")?.funding ?? 0)} of the city's ${money(citiesOnly[3]?.amount ?? 0)}). ` +
      `${citiesAlso[0]?.name ?? "London"} is an outlier in scale rather than in kind, taking ${money(citiesAlso[0]?.amount ?? 0)} on the 'Football Also' side across ${citiesAlso[0]?.rounds ?? 0} rounds, while ${cityChicago?.name ?? "Chicago"}'s entire ${money(cityChicago?.amount ?? 0)} is one StatsPerform round. ` +
      `Recent standouts include Dubai, Lisbon and Belfast. None has raised more than ${money(Math.ceil(Math.max(cityDubai?.amount ?? 0, cityLisbon?.amount ?? 0, cityBelfast?.amount ?? 0)))}.`,
    companiesOnly:
      `The top ten football-only companies account for ${percent(onlyTopTen, onlyTotal)} of all football-only funding, and ${companiesOnly[0]?.name ?? "Sorare"} and ${companiesOnly[1]?.name ?? "Onefootball"} take ${percent(onlyTopTwo, onlyTopTen)} of that top ten between them. ${companiesOnly[0]?.name ?? "Sorare"} alone is ${percent(companiesOnly[0]?.funding ?? 0, onlyTotal)} of every dollar raised by a football-only startup since 2021. ` +
      `Below them the field diversifies: ${companiesOnly.slice(2, 5).map(row => `${row.name} (${money(row.funding)})`).join(", ")} across training hardware, club-owned fan technology and tracking data, then ${lowerOnlyNames.slice(0, -1).join(", ")} and ${lowerOnlyNames.at(-1)} across video, wearables, merchandise, fantasy and gaming. Barca Vision, Skill Corner and Draftea are all new to this ranking.`,
    companiesAlso:
      `DAZN's ${money(dazn?.funding ?? 0)} is ${percent(daznShareTopTen, alsoTopTen)} of the multisport top ten and ${percent(daznShareTopTen, alsoTotal)} of all 'Football Also' funding, close to the ${money(onlyTotal)} raised by every football-only startup in this report combined. ` +
      `Behind it sits a tight cluster: ${companiesAlso[1]?.name ?? "Teamworks"} and ${companiesAlso[2]?.name ?? "Cosm"} at ${money(companiesAlso[1]?.funding ?? 0)} each, ${companiesAlso[3]?.name ?? "Genius Sports"} at ${money(companiesAlso[3]?.funding ?? 0)} and ${companiesAlso[4]?.name ?? "StatsPerform"} at ${money(companiesAlso[4]?.funding ?? 0)}, spanning athlete operations, immersive venues and sports data. ` +
      `Ticketing adds a further ${money(ticketingTotal)} through Tickpick and SeatGeek, and London and New York between them host ${londonNames + nyNames} of the ten.`,
  };
}
