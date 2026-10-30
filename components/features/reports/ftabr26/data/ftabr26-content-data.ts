// @ts-nocheck
/* eslint-disable */
/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · Football Tech & Business Report 2026 — EDITORIAL PLACEHOLDERS

   TODO: replace with 2026 research before publication.

   Everything below is carried over from the Football Tech Report 2025
   (SportsTechX, Oct 2025). Page references point at the source PDF at
   attached_assets/Football_Tech_Report_2025_1787037260416.pdf.
   ──────────────────────────────────────────────────────────────────────── */

import type { Ftabr26Startup } from "../lib/ftabr26-types";

/* ── Hero & framing (source pp1, 4) ─────────────────────────────────────── */

export const FTABR26_HERO = {
  titleLines: ["FOOTBALL", "TECH & BUSINESS", "REPORT 2026"],
  edition: "Third edition",
  standfirst:
    "Our deep dive into what's happening in football innovation. Investment patterns, the innovators defining where the industry is going, and the trends that separate real adoption from hype.",
  presentedBy: "SportsTechX",
  hashtag: "#FTABR26",
} as const;

export const FTABR26_ABOUT =
  "Yes, we're talking about soccer. We distinguish between football-only and multisport platforms throughout, to accurately attribute investment raised specifically for football innovation. If you're investing in this space, building in it, or trying to figure out where football tech is actually headed versus where the hype says it's going, this report is meant to cut through the noise.";

/* ── Ten trends, in three thematic groups
   Source: attached_assets/FTABR26_Micro_Trends_1789043561122.pdf (10 Sep 2026) ─── */

export type Trend = {
  id: string;
  num: string;
  title: string;
  body: string;
  readMore?: { label: string; url?: string };
};

export type TrendGroup = {
  key: string;
  label: string;
  heading: string;
  description: string;
  trends: Trend[];
};

export const FTABR26_TREND_GROUPS: TrendGroup[] = [
  {
    key: "game",
    label: "Tech",
    heading: "TECHNOLOGY'S IMPACT\nON THE GAME ITSELF",
    description: "How innovation is reshaping the game on the pitch, from officiating and venues to the way players are valued and represented.",
    trends: [
      {
        id: "officiating",
        num: "01",
        title: "OFFICIATING TECHNOLOGY MOVES FROM INNOVATION TO INFRASTRUCTURE",
        body: "FTR25 described officiating tech as an accelerating shift. Ten months on, the shift is finished and the work has changed. Semi-automated offside is live in the Bundesliga, installed at the Kölner Keller VAR hub, where eleven additional roof-mounted cameras track 21 offside-relevant body points per player. The Premier League's Football Principles for 2026/27 no longer argue for adoption. They set out how existing systems will be run better, folding SAOT efficiency, referee announcements and the in-stadium VAR experience into a standing VAR Improvement Plan. SAOT saved an average of 27 seconds per offside event in its first Premier League season. The question has moved from whether leagues install this to how well they operate it.",
        readMore: { label: "Premier League sets Football Principles for 2026/27", url: "https://www.premierleague.com/en/news/4674118/premier-league-sets-football-principles-for-202627-season" },
      },
      {
        id: "stadium-future",
        num: "02",
        title: "THE STADIUM OF THE FUTURE",
        body: "Manchester United secured 25 acres north-west of Old Trafford in June, the majority of the land needed for a 100,000-seat stadium costing roughly £2bn and sitting inside a 370-acre regeneration scheme; the Wharfside Masterplan followed in July, confirming the location and stepping back from the earlier canopy concept. It is the largest of several concurrent commitments, alongside PIF exploring outside investment for Newcastle's plans, Real Madrid's Bernabéu returns and Morocco's 2030 build programme. Capital is flowing into venues at a scale not seen since the last World Cup cycle, and the projects are increasingly justified on non-matchday revenue rather than on football alone.",
        readMore: { label: "Manchester United secure land for new 100,000-seater stadium", url: "https://www.reuters.com/sports/soccer/manchester-united-secure-land-new-100000-seater-stadium-2026-06-23/" },
      },
      {
        id: "young-players-asset",
        num: "03",
        title: "YOUNG PLAYERS ARE BECOMING FOOTBALL'S MOST VALUABLE INVESTMENT ASSET",
        body: "More than half of European clubs' transfer spending now goes on players aged 23 or under, with 9.0% of the total spent on teenagers outright. UEFA's landscape data puts an average profit margin of around 80.0% on club-trained players, generating over €7bn overall. Youth has become an asset class: acquire before peak valuation, develop, then retain or resell. Real Madrid have built their squad model around it and Barcelona have followed. The consequence for the technology market is direct: recruitment and scouting analytics, physical and load monitoring, and player-valuation modelling are no longer efficiency tools but the infrastructure protecting the single largest line of club spending.",
        readMore: { label: "UEFA: Five European football trends, from record attendances to record transfer spending", url: "https://www.uefa.com/news-media/news/029d-1ebb17a852a6-fa4e86c59d7d-1000--five-european-football-trends-from-record-attendances-to/" },
      },
      {
        id: "player-likeness",
        num: "04",
        title: "PLAYERS HAVE LOST CONTROL OF THEIR OWN LIKENESS",
        body: "Unlicensed betting operators are now manufacturing endorsements outright. Vietnamese-facing casino QH88 built an entire website around a one-minute AI-generated video of Bruno Fernandes signing an ambassadorial contract at Old Trafford, although no such deal existed. Frame-by-frame analysis identified the giveaways: blurred detail, continuity errors and generic facial features, none of them visible to someone scrolling. Days earlier, operator Nightwin had run ads built on a fabricated BBC article claiming Jude Bellingham had launched a betting app. Neither operator appears on the Gambling Commission's register, both sit behind offshore shell structures, and there is no criminal offence covering non-intimate deepfakes. FTR25's Paquetá case showed players can't opt out of data collection. This shows they can't opt out of being synthesised either.",
        readMore: { label: "A footballing deepfake: how Bruno Fernandes fell victim to an unlicensed betting operator", url: "https://www.theguardian.com/football/2026/jul/05/a-footballing-deepfake-how-bruno-fernandes-fell-victim-to-an-unlicensed-betting-operator" },
      },
    ],
  },
  {
    key: "media",
    label: "Media & Fans",
    heading: "MEDIA, GAMING, AND\nTHE NEW FAN ECOSYSTEM",
    description: "Where entertainment, interactivity, and digital culture redefine how fans engage with the sport.",
    trends: [
      {
        id: "entertainment-formats",
        num: "05",
        title: "RISE OF ENTERTAINMENT-DRIVEN FOOTBALL FORMATS",
        body: "The formats FTR25 flagged as a rising wave now have institutional capital and a competitive market. Kings League closed a $63.0M round in February 2026 led by Alignment Growth, taking it past $160.0M raised in total, with a US domestic competition as the stated use of funds, while Baller League got to the US first, launching in March. The more interesting development is that the model has crossed into the women's game on its own terms: the Sensational League, a Copenhagen-based 7v7 competition running April to August, drafts players through team captains, streams on YouTube, uses a ball designed for female players, and pays every participant a wage. World Sevens Football's 2026 London edition at Brentford's Gtech carried a $1.5M prize pool.",
        readMore: { label: "Alignment Growth leads $63.0M Kings League funding round", url: "https://www.sportcal.com/news/investment-firm-alignment-growth-leads-63m-kings-league-funding-round/" },
      },
      {
        id: "creator-distribution",
        num: "06",
        title: "CREATOR-LED DISTRIBUTION REDEFINING SPORTS MEDIA",
        body: "FTR25 covered creators as broadcasters, with CazéTV taking World Cup rights and Infantino appearing on iShowSpeed's stream. The 2026 version is structural rather than promotional. KSI took a minority stake in National League South side Dagenham & Redbridge in March, then in August announced a season-long broadcast and distribution partnership with the club and DAZN for 2026/27, streaming fixtures to his 18.9 million YouTube subscribers alongside behind-the-scenes access and a docuseries. The creator is simultaneously owner, broadcaster and distribution channel, with DAZN supplying the production layer underneath. For a sixth-tier club, that reach is unavailable through any conventional rights market.",
        readMore: { label: "KSI, DAZN and Dagenham & Redbridge announce landmark broadcast partnership", url: "https://www.daggers.co.uk/ksi-dazn-and-dagenham-redbridge-announce-landmark-broadcast-partnership-to-redefine-non-league-football-coverage/" },
      },
      {
        id: "gaming-convergence",
        num: "07",
        title: "GROWING CONVERGENCE OF FOOTBALL AND GAMING",
        body: "Clubs are moving from licensing their brand into games to competing inside them. Manchester City launched a professional Rocket League roster in December, the only Premier League club in the title, then signed former world champion Enzo “Seikoo” Grondein in March and reached its first RLCS LAN at the Paris Major in front of 15,000 fans, a decade into an esports programme the club insists is a performance project rather than a badging exercise. At the league level, the Bundesliga and EA Sports FC extended a partnership running since 1998 at Gamescom 2026, keeping both German divisions in FC 27 and FC Mobile. The renewal's substance is in the data: deeper collaboration through TRACAB's tracking capability, now EA-owned, and new fan touchpoints through the EA Sports App.",
        readMore: { label: "Man City esports on Rocket League rise", url: "https://insidersport.com/2026/06/16/man-city-esports-on-rocket-league-rise/" },
      },
    ],
  },
  {
    key: "business",
    label: "Business & Data",
    heading: "OWNERSHIP, DATA, AND\nTHE BUSINESS OF FOOTBALL",
    description: "Inside the evolving structures shaping control, accountability, and value creation in the modern game.",
    trends: [
      {
        id: "multi-club-ownership",
        num: "08",
        title: "RISE AND STRAIN OF MULTI-CLUB OWNERSHIP",
        body: "FTR25 predicted strain. The strain now has enforcement precedent behind it. The Court of Arbitration for Sport upheld UEFA in three separate appeals against the exclusions of Drogheda United, DAC 1904 and Crystal Palace. The rulings confirmed that the 1 March assessment date under Article 5 is absolute and offers no flexibility to clubs that become compliant afterwards. Palace, the FA Cup holders, were dropped to the Conference League. UEFA then issued a December circular confirming no substantial change to Article 5 for 2026/27, and signalling that blind trusts, previously the standard workaround, are not a permanent safe harbour. The model keeps expanding; the regulatory tolerance for its ambiguities has closed.",
        readMore: { label: "Caught in the regulatory offside trap: multi-club ownership and the 1 March deadline", url: "https://www.ropesgray.com/en/insights/viewpoints/102mk39/caught-in-the-regulatory-offside-trap-multi-club-ownership-for-portfolio-manager" },
      },
      {
        id: "stablecoin-sponsorship",
        num: "09",
        title: "STABLECOINS ARRIVE ON THE SHIRT",
        body: "Chelsea ended a four-season search for a front-of-shirt sponsor by signing Circle Internet Group, putting the USDC stablecoin brand on men's, women's and academy shirts from 2026/27. This is the first time a crypto financial-services firm has held a Premier League club's principal shirt slot. Terms weren't disclosed; the club had been seeking £50–65m a season, and the deal is understood to run one year with an option to extend. The distinction from the 2021 wave matters: this isn't a fan token or an exchange sponsorship but a regulated payments company, and it lands months after the FCA warned Premier League clubs over partnerships with unauthorised crypto firms.",
        readMore: { label: "Chelsea announces Circle Internet Group as Principal Partner", url: "https://www.chelseafc.com/en/news/article/chelsea-football-club-announces-circle-internet-group-as-principal-partner" },
      },
      {
        id: "fan-ownership",
        num: "10",
        title: "FAN OWNERSHIP: AN ONGOING EXPERIMENT",
        body: "Germany's 50+1 rule returned to open dispute in 2026. It guarantees that a club's members' association keeps a majority of voting rights in the commercial entity that runs the team, capping what any outside investor can control. Hertha Berlin sold 78.8% of its commercial entity and still could not hand over control. The pressure is competitive: Premier League clubs operate with billionaire backing, La Liga sides restructure around private equity, and the DFL's own attempt at a league-level investor deal was abandoned after sustained fan protest. German supporters continue to defend the rule; the argument is now about whether the protection is worth the revenue gap it creates.",
        readMore: { label: "What is the Bundesliga's 50+1 ownership rule?", url: "https://www.bbc.com/sport/football/articles/c2k7w0k9ky9o" },
      },
    ],
  },
];

/* ── Feature: Women's football (source p21) ─────────────────────────────── */

export const FTABR26_WOMENS = {
  eyebrow: "Feature",
  title: "WOMEN'S FOOTBALL",
  standfirst: "The new frontier for ownership and innovation.",
  intro:
    "Funding and recognition in women's football have surged in recent years, driven by the rise of multi-sport ownership models and growing investment from major technology companies. Ownership groups managing both men's and women's teams are building shared infrastructures, marketing capabilities, and revenue streams that strengthen the women's game. Where the women's game stands apart is in its commercialisation model, from matchday experiences to brand partnerships. That model is built on inclusivity, community, and sustainability rather than scale alone. Together, these forces have transformed women's football from a niche pursuit into one of the fastest-growing and most commercially viable segments of global sport.",
  ownershipHeading: "Multi-Club Ownership",
  ownership: [
    { name: "Monarch Collective", note: "The first investment fund dedicated exclusively to women's sports." },
    { name: "Kynisca",            note: "Michele Kang's multi-club group spanning the NWSL, the FA WSL and D1 Arkema." },
    { name: "Brera Holdings",     note: "Nasdaq-listed multi-club owner building a portfolio across emerging markets." },
    { name: "Mercury13",          note: "European multi-club platform acquiring and scaling women's football clubs." },
  ],
  bigTechHeading: "Big Tech Initiatives",
  bigTech: [
    {
      name: "Google Pixel",
      body: "Google Pixel announced Pixel FC, a collective of women's football creators and presenters coming together to help close the visibility gap within women's football. Alongside Powerhouse Project, they also launched Pixel FC Academy, a landmark programme helping young women break into football content creation and media, delivered in partnership with the FA, Arsenal FC and Liverpool FC.",
      url: "https://store.google.com/intl/en_uk/ideas/articles/google-pixel-fc-supporting-womens-football-coverage/",
    },
    {
      name: "Meta",
      body: "Meta announced their new cohort of student-athletes ready to participate in the NCAA's long-standing partnership to empower the next generation of female athletes.",
      url: "https://www.si.com/college/nil/nil-news/meta-announces-new-cohort-ncaa-partnership-empower-female-athletes",
    },
    {
      name: "Netflix",
      body: "Under Pressure: The U.S. Women's World Cup Team allows audiences to intimately follow the U.S. Women's National Team's players and coaches, revealing an inside look at the most decorated team in soccer history. Netflix has secured the rights to show live coverage of the 2027 and 2031 Women's World Cups in the United States.",
      url: "https://media.netflix.com/en/only-on-netflix/81697366",
    },
    {
      name: "Adobe",
      body: "Through the Adobe Women's FA Cup in the UK and a partnership with the National Women's Soccer League in the USA, Adobe is elevating the women's game by inspiring players, clubs and creators to tell and share their stories with the world.",
      url: "https://blog.adobe.com/en/publish/2023/11/23/teaming-up-with-the-football-association-to-elevate-the-womens-game",
    },
  ],
} as const;

/* ── Feature: MCO in women's football (source p21) ──────────────────────────

   Both the web article and PDF ownership cards use the narrative and groups
   below. FTABR26_WOMENS above is a legacy editorial snapshot, not rendered.
   ──────────────────────────────────────────────────────────────────────── */

/** One club inside an ownership group. `website` is null where no domain has
    been verified — the crest then falls back to a monogram, which beats
    risking logo.dev resolving a plausible-but-wrong domain to the wrong badge. */
export type Ftabr26McoClub = {
  name: string;
  website: string | null;
  /** Local crest file, preferred over the logo.dev lookup — for clubs logo.dev
      has no real mark for. Lives in client/public/reports/ftabr26/crests/. */
  crest?: string;
  /** Set for monochrome dark artwork, which would otherwise disappear against
      the dark-theme tile. */
  crestInvertOnDark?: true;
};

/** A multi-club ownership group: the owner on the left, its clubs to the right. */
export type Ftabr26McoGroup = {
  name: string;
  /** Owner site, and how its logo resolves. Null for owners with no public
      site of their own — those render a monogram and carry no link. */
  website: string | null;
  /** Principal(s) behind the vehicle, set small under the owner name. */
  principal?: string;
  clubs: Ftabr26McoClub[];
};

export const FTABR26_WOMENS_MCO_GROUPS: Ftabr26McoGroup[] = [
  {
    name: "Kynisca",
    website: "kynisca.com",
    principal: "Michele Kang",
    clubs: [
      { name: "OL Lyonnes",            website: "ollyonnes.fr", crest: "/reports/ftabr26/crests/ol-lyonnes.webp" },
      { name: "Washington Spirit",     website: "washingtonspirit.com" },
      { name: "London City Lionesses", website: "londoncitylionesses.com" },
    ],
  },
  {
    name: "Monarch Collective",
    website: "monarchcoll.com",
    clubs: [
      { name: "Angel City",      website: "angelcity.com" },
      { name: "San Diego Wave",  website: "sandiegowavefc.com" },
      { name: "Boston Legacy",   website: "bostonlegacyfc.com" },
      { name: "Viktoria Berlin", website: "fcviktoria.com" },
    ],
  },
  {
    name: "Mercury13",
    website: "mercury13.com",
    clubs: [
      { name: "FC Como Women",      website: "comowomen.com" },
      /* Bristol City and Sunderland share the parent club's site, so those
         crests are the club badge rather than a women's-team mark. */
      { name: "Bristol City Women", website: "bcfc.co.uk" },
      { name: "FC Badalona Women",  website: "badalonawomen.com", crest: "/reports/ftabr26/crests/fc-badalona-women.webp", crestInvertOnDark: true },
    ],
  },
  {
    name: "Crux Football",
    website: "cruxfootball.com",
    clubs: [
      { name: "Montpellier HSC Féminines", website: "mhscfoot.com" },
      { name: "FC Rosengård",              website: "fcrosengard.se" },
    ],
  },
  {
    name: "Bay Collective",
    website: "baycollective.com",
    principal: "Sixth Street",
    clubs: [
      { name: "Bay FC",               website: "bayfc.com" },
      { name: "Sunderland AFC Women", website: "safc.com" },
    ],
  },
  {
    /* No site of its own — the only public page is the Kansas City Current's,
       which would put a club crest where the owner's mark belongs. */
    name: "Ballard Capital",
    website: null,
    principal: "Angie & Chris Long",
    clubs: [
      { name: "Kansas City Current", website: "kansascitycurrent.com" },
      { name: "HB Køge Women",       website: "hbkoge.dk" },
    ],
  },
];

export const FTABR26_WOMENS_MCO = {
  eyebrow: "Feature",
  title: "MCO IN WOMEN'S FOOTBALL",
  standfirst: "The new frontier for ownership and innovation.",
  intro:
    "Funding and recognition in women's football have surged in recent years, driven by the rise of multi-club ownership. Groups managing both men's and women's teams are building shared infrastructure and revenue streams that strengthen the women's game, while a newer class of owner assembles portfolios around women's clubs from the outset. UEFA has since confirmed that those rules apply in full to the women's game: ahead of the 2026 Women's Champions League final, head of women's football Nadine Kessler said clubs under common ownership will not be permitted in the same competition. She ruled out any waiver on the grounds that the women's game is less developed, asking why UEFA would protect sporting integrity in men's football but not women's.",
};

/* ── Insights: one article per theme (web report) ──────────────────────────

   The web report's Insights section is three single-story articles, plus the
   World Cup recap as a bonus tab. Each renders as copy on the left, a graphic
   on the right and "Our take" underneath.

   FTABR26_TREND_GROUPS above is left as-is: report-ftabr26-pdf.tsx still
   prints the ten-trend layout from it, and ftabr26-live.ts counts it for the
   (hidden) executive summary. */

export type InsightGraphic =
  /** Supplied photos, served from client/public/reports/ftabr26/; the first
      runs full width with the rest side by side beneath it. */
  | { kind: "collage"; images: { src: string; alt: string }[] }
  | { kind: "mco" }
  | { kind: "creator-deals" }
  /** A supplied image, served from client/public/reports/ftabr26/. */
  | { kind: "image"; src: string; alt: string };

export type InsightArticle = {
  key: string;
  label: string;
  /** Tab heading and intro, set above the article box. */
  heading: string;
  description: string;
  title: string;
  body: string[];
  /** Our editorial view, set under the copy and graphic. Omitted → not shown. */
  take?: string;
  /** Omitted → the copy runs full width. */
  graphic?: InsightGraphic;
  sources?: { label: string; url: string }[];
};

/** Creator live-rights deals for the Media & Fans article's graphic.
    Source: attached_assets/image_1790751981814.png. */
export const FTABR26_CREATOR_DEALS: { date: string; creator: string; event: string; what: string }[] = [
  { date: "Aug 26",  creator: "LiveMode / CazéTV",           event: "Premier League & UCL",  what: "Weekly free YouTube coverage in Brazil and Portugal" },
  { date: "Aug 26",  creator: "KSI",                         event: "Dagenham & Redbridge",  what: "Streamed a match for the club he co-owns" },
  { date: "Aug 26",  creator: "Men in Blazers",              event: "Tottenham Hotspur",     what: "Carried the club's live feed for a friendly" },
  { date: "Jul 26",  creator: "CazéTV",                      event: "WTA Tour, Brazil",      what: "Bought exclusive Brazilian rights off ESPN" },
  { date: "Jun 26",  creator: "iShowSpeed",                  event: "FIFA World Cup 2026",   what: "Streamed official match feeds with FIFA, Fox and YouTube" },
  { date: "May 26",  creator: "CazéTV",                      event: "LaLiga, Brazil",        what: "Took full live rights, displacing Disney" },
  { date: "Apr 26",  creator: "Enjoy Basketball",            event: "NBA",                   what: "Alternate telecast of a Pistons game on League Pass" },
  { date: "Feb 26",  creator: "ZwebackHD, Box2Box, Bugs",    event: "Bundesliga, Canada",    what: "Creator-led live streams on YouTube and Twitch" },
  { date: "2025/26", creator: "The Overlap",                 event: "Bundesliga, UK",        what: "20 live Friday night matches, sold alongside Sky and BBC" },
  { date: "2025/26", creator: "That's Football",             event: "Bundesliga, UK",        what: "A separate 20 live Friday night matches, same tier" },
];

export const FTABR26_INSIGHTS: InsightArticle[] = [
  {
    key: "tech",
    label: "Tech",
    heading: "TECHNOLOGY'S IMPACT\nON THE GAME ITSELF",
    description: "How innovation is reshaping the game on the pitch, from officiating and venues to the way players are valued and represented.",
    title: "OFFICIATING TECHNOLOGY MOVES FROM INNOVATION TO INFRASTRUCTURE",
    body: [
      "Last year we described officiating technology as an accelerating shift. In 2026 it became infrastructure. At the World Cup, an upgraded semi-automated offside system, built on 3D scans of all 1,248 players, sent clear offsides straight to the officials on the pitch instead of routing them through the VAR. Referee body cameras fed the broadcast and stadium screens, and midway through the tournament referees began explaining overturned decisions over the stadium PA.",
      "The rulebook has followed. IFAB's 2026/27 Laws let any competition equip referees, assistants and fourth officials with body cameras, and widen VAR's remit to wrongly issued second yellows and cases of mistaken identity. The Premier League's 2026/27 principles no longer argue for adoption; they fold SAOT efficiency into a standing VAR Improvement Plan. From this season the league also publishes weekly Key Match Incidents Panel reports and Ref Cam audio from selected fixtures.",
    ],
    take:
      "The technology question is settled; the trust question is not. Almost every officiating change in 2026 (referee announcements, Ref Cam audio, published panel verdicts) is about showing fans a decision rather than making it. That is where the next opportunity sits: products that turn officiating data into something fans, broadcasters and clubs can see and believe. Leagues that treat transparency as part of the product, not a concession, will be the ones that take the heat out of the argument.",
    graphic: {
      kind: "collage",
      images: [
        { src: "/reports/ftabr26/insights/officiating-var-review.webp", alt: "A referee reviews a decision at the pitchside VAR monitor" },
        { src: "/reports/ftabr26/insights/officiating-production-truck.webp", alt: "Live match feeds on a wall of screens inside a Serie A broadcast production truck" },
        { src: "/reports/ftabr26/insights/officiating-ref-cam.webp", alt: "A player appeals to the referee, seen through a referee body camera" },
      ],
    },
    sources: [
      { label: "FIFA: innovation at the World Cup 2026", url: "https://inside.fifa.com/news/offside-decisions-referee-body-cams-innovation-world-cup-2026" },
      { label: "The FA: 2026/27 law changes explained", url: "https://www.thefa.com/football-rules-governance/lawsandrules/laws/football-11-11/law-changes-explained" },
      { label: "Premier League: Football Principles for 2026/27", url: "https://www.premierleague.com/en/news/4674118/premier-league-sets-football-principles-for-202627-season" },
      { label: "Yahoo Sports: Premier League VAR changes for 2026/27", url: "https://sports.yahoo.com/articles/premier-league-announce-key-changes-115735398.html" },
    ],
  },
  {
    key: "media",
    label: "Media & Fans",
    heading: "MEDIA, GAMING, AND\nTHE NEW FAN ECOSYSTEM",
    description: "Where entertainment, interactivity, and digital culture redefine how fans engage with the sport.",
    title: "CREATOR-LED DISTRIBUTION REDEFINING SPORTS MEDIA",
    body: [
      "Four years ago, FIFA gave a Brazilian streamer the rights to show 22 matches from the 2022 World Cup for free on YouTube. That experiment became CazéTV. This summer it was the only broadcaster in Brazil showing all 104 matches of the 2026 World Cup; Globo, the country's dominant football broadcaster for decades, carried 55. It has since added LaLiga rights in Brazil through 2032, exclusive WTA Tour rights bought from ESPN, and weekly Premier League and Champions League coverage in Brazil and Portugal.",
      "For most of the last decade, creators made shoulder content around the sport, and live footage meant a takedown notice. That boundary has moved step by step. The Bundesliga handed 20 live Friday night games each to The Overlap and That's Football in the UK. The NBA commissioned an alternate telecast with Enjoy Basketball. Tottenham came to Men in Blazers to stream a friendly, drawing around 10,000 concurrent viewers against a forecast of 3,000. And DAZN lets KSI stream matches for Dagenham & Redbridge, the club he co-owns: give away one free match a week, and anyone who wants a second has to subscribe.",
      "FIFA went further at the World Cup, launching its first global creator programme with Preferred Platform deals for TikTok and YouTube, Insider Access for selected creators, and the first ten minutes of every match livestreamed on official partners' YouTube channels. More than 1.7 billion unique viewers watched World Cup-related content on YouTube during the tournament.",
      "The 2026 World Sevens Football London edition at Brentford's Gtech Community Stadium featured a $1.5M prize pool.",
    ],
    take:
      "The money is still thin. Ampere Analysis found \"little to no money changing hands\" in European creator rights deals, and the audiences are modest and contested: The Overlap averaged around 14,000 viewers across its Bundesliga streams. For most rights holders this is marginal inventory, used to reach fans that conventional broadcasts miss or as an acquisition channel for the subscription behind it. Creators are not replacing broadcasters. But the old division, where broadcasters got the game and creators talked about it, is disappearing. Creators are becoming an integral part of the broadcast stack, and CazéTV shows how far that can go when the experiment works.",
    graphic: { kind: "creator-deals" },
    sources: [
      { label: "KSI, DAZN and Dagenham & Redbridge announce landmark broadcast partnership", url: "https://www.daggers.co.uk/ksi-dazn-and-dagenham-redbridge-announce-landmark-broadcast-partnership-to-redefine-non-league-football-coverage/" },
      { label: "Just Women's Sports: W7F Manchester United, Aston Villa and London edition", url: "https://justwomenssports.com/reads/w7f-manchester-united-world-seven-football-aston-villa-london-edition-2026/" },
      { label: "World Sevens Football: London edition prize pool", url: "https://www.worldsevensfootball.com/news/chelsea-fc-women-crowned-world-sevens-football-london-champions-as-three-day-spectacular-sets-new-records" },
    ],
  },
  {
    key: "business",
    label: "Business",
    heading: "OWNERSHIP, DATA, AND\nTHE BUSINESS OF FOOTBALL",
    description: "Inside the evolving structures shaping control, accountability, and value creation in the modern game.",
    title: FTABR26_WOMENS_MCO.title,
    body: [FTABR26_WOMENS_MCO.intro],
    take:
      "Women's football is the one part of the game where multi-club ownership is being built from the ground up rather than bolted on. That gives groups such as Kynisca and Monarch Collective the chance to share data, medical and commercial infrastructure across their clubs from day one, the operational upside MCO promises but rarely delivers in the men's game. UEFA's refusal to grant an exemption means the same regulatory ceiling applies, so the portfolios that plan around it now will be best placed as the women's game scales.",
    graphic: { kind: "mco" },
  },
];

/* ── Feature: FIFA World Cup 2026 (source p22) ──────────────────────────── */

export type WorldCupTechCategory =
  | "Officiating"
  | "Broadcast & Production"
  | "Fan Experience"
  | "Venue Operations & Security"
  | "Player Performance & Welfare";

/* Drives the order of the category accordion on the web report. Matches the
   order the categories first appear in the source CSV. */
export const FTABR26_WORLDCUP_TECH_CATEGORIES: WorldCupTechCategory[] = [
  "Officiating",
  "Broadcast & Production",
  "Fan Experience",
  "Venue Operations & Security",
  "Player Performance & Welfare",
];

export type WorldCupTech = {
  id: string;
  title: string;
  category: WorldCupTechCategory;
  body: string;
  source?: { label: string; url: string };
};

/* A post-tournament record of what actually ran at the 2026 World Cup, which is
   why there is no longer a Confirmed/Expected status: the tournament has been
   played. Derived from
   attached_assets/FTABR26_WorldCup2026_Tech_1788505465798.csv — that file is the
   source of truth, so regenerate rather than hand-edit.

   Two entries from the old pre-tournament list are deliberately absent:
     · In-seat entertainment — the CSV row carries no confirmed description or
       source, and the only copy we had was speculative.
     · FIFA Player App — dropped from the CSV. FIFA AI Pro is adjacent but a
       distinct product and is included below. */
export const FTABR26_WORLDCUP_TECH: WorldCupTech[] = [
  {
    id: "connected-ball",
    title: "Connected ball technology",
    category: "Officiating",
    body:
      "A 500Hz sensor suite embedded in the adidas Trionda match ball fed exact kick-point and ball-position data to the video team, converting judgement calls on offside timing and handball contact into measurable events.",
    source: { label: "FIFA", url: "https://inside.fifa.com/innovation/innovating-the-game/connected-ball-technology" },
  },
  {
    id: "semi-automated-offside",
    title: "Semi-automated offside technology",
    category: "Officiating",
    body:
      "Advanced semi-automated offside technology made its World Cup debut in 2026. For clear positional offsides, alerts went directly to on-pitch officials instead of first passing through VAR. The system used individual 3D player scans to make offside decisions and broadcast visualisations more accurate.",
    source: { label: "FIFA", url: "https://inside.fifa.com/innovation/news/offside-decisions-referee-body-cams-innovation-world-cup-2026" },
  },
  {
    id: "player-avatars",
    title: "Player avatars",
    category: "Officiating",
    body:
      "Lenovo 3D-scanned all 1,248 participating players before kick-off, giving the offside system true individual dimensions and replacing the old skeleton-line replay graphic with a photo-realistic model.",
    source: { label: "Tom's Guide", url: "https://www.tomsguide.com/wellness/fitness/1-200-digital-athlete-avatars-and-jitter-free-field-footage-how-lenovo-is-using-ai-to-make-the-2026-fifa-world-cup-even-better" },
  },
  {
    id: "var-announcements",
    title: "In-stadium referee announcements of VAR outcomes",
    category: "Officiating",
    body:
      "Referees began explaining overturned decisions over the stadium PA partway through the tournament - a transparency process change rather than a new system, introduced after teams complained about opaque calls.",
    source: { label: "Times of India", url: "https://timesofindia.indiatimes.com/sports/football/fifa-world-cup/fifa-makes-major-var-change-for-remainder-of-world-cup-2026-after-teams-raise-furious-refereeing-complaints/articleshow/132301396.cms" },
  },
  {
    id: "ifab-laws",
    title: "IFAB Laws of the Game 2025/26",
    category: "Officiating",
    body:
      "The first major tournament played under the new laws: an eight-second goalkeeper limit sanctioned by corner, five-second countdowns on throw-ins and goal kicks, ten seconds to leave the pitch when substituted, a mandatory minute off after on-pitch treatment, and an expanded VAR remit covering second yellows.",
    source: { label: "Sky Sports", url: "https://www.skysports.com/football/news/12098/13549645/world-cup-ifab-confirm-new-var-powers-10-second-substitutions-and-tactical-timeout-ban-in-major-rule-changes" },
  },
  {
    id: "host-broadcast-services",
    title: "Host Broadcast Services",
    category: "Broadcast & Production",
    body:
      "HBS ran 45 cameras per match across all 104 fixtures - polecams, cablecams, cine-style rigs, 360-degree cameras and referee cams - all routed back to a single International Broadcast Centre in Dallas.",
    source: { label: "The Ball Business", url: "https://theballbusiness.com/every-technology-at-the-2026-fifa-world-cup-and-what-it-means-for-football/" },
  },
  {
    id: "referee-view",
    title: "Referee View (referee body-cam)",
    category: "Broadcast & Production",
    body:
      "A head-mounted referee camera with real-time AI stabilisation smoothing the motion blur, putting the official's first-person perspective into live World Cup broadcast for the first time.",
    source: { label: "FIFA", url: "https://inside.fifa.com/news/lenovo-world-cup-2026-technology-ref-cam-player-avatars-ai" },
  },
  {
    id: "fifa-id",
    title: "FIFA ID",
    category: "Fan Experience",
    body:
      "The mandatory digital identity account sitting behind ticketing: every attendee aged 13 and over needed one, paper tickets were retired entirely, and the same credential carried through to stadium entry.",
    source: { label: "FIFA Ticketing", url: "https://gpcustomersupportfwc2026.tickets.fifa.com/hc/en-gb/articles/30203398694685-1-How-do-I-create-a-FIFA-ticketing-account" },
  },
  {
    id: "fifa-fan-id",
    title: "FIFA Fan ID (NFC card)",
    category: "Fan Experience",
    body:
      "A free NFC card collected at all 16 venues that, tapped to a phone, opened a personalised digital layer of content, rewards and custom merchandise - FIFA's attempt to bridge the physical and digital matchday.",
    source: { label: "SportsPro", url: "https://www.sportspro.com/news/fifa-world-cup-2026-fan-id-may-2026/" },
  },
  {
    id: "fifa-plus-app",
    title: "FIFA+ / official tournament app",
    category: "Fan Experience",
    body:
      "A single software layer intended to carry the fan from hotel to seat: schedules, live scores, real-time alerts, 3D stadium maps, arrival planning and location-based prompts.",
    source: { label: "Propmodo", url: "https://propmodo.com/what-fifa-deployed-at-the-2026-world-cup-is-a-preview-of-where-building-technology-is-heading/" },
  },
  {
    id: "ar-overlay",
    title: "In-stadium AR overlay",
    category: "Fan Experience",
    body:
      "Fans in the bowl could point a phone at the pitch and see live player names, tracking speeds and physical-intensity data overlaid on the action in front of them.",
    source: { label: "The Ball Business", url: "https://theballbusiness.com/every-technology-at-the-2026-fifa-world-cup-and-what-it-means-for-football/" },
  },
  {
    id: "dynamic-ticket-pricing",
    title: "Dynamic ticket pricing",
    category: "Fan Experience",
    body:
      "The first World Cup priced by demand rather than fixed face value, sold through staged lotteries into an official FIFA resale market with no price cap - the tournament's most contested piece of technology and the one with no on-pitch component at all.",
    source: { label: "Al Jazeera", url: "https://www.aljazeera.com/sports/2026/4/27/fifa-world-cup-2026-dynamic-pricing-match-tickets-peter-moore" },
  },
  {
    id: "private-5g",
    title: "Verizon private 5G",
    category: "Venue Operations & Security",
    body:
      "Private 5G networks were built into all 16 venues, with public capacity at the 11 US stadiums lifted three to fivefold, so 80,000 people streaming and uploading at once didn't collapse the connection.",
    source: { label: "The Ball Business", url: "https://theballbusiness.com/every-technology-at-the-2026-fifa-world-cup-and-what-it-means-for-football/" },
  },
  {
    id: "command-centre",
    title: "Intelligent Command Centre",
    category: "Venue Operations & Security",
    body:
      "A single control room monitored crowd density and security conditions across all 16 venues simultaneously, surfacing developing problems to tournament officials before they reached the concourse.",
    source: { label: "The Ball Business", url: "https://theballbusiness.com/every-technology-at-the-2026-fifa-world-cup-and-what-it-means-for-football/" },
  },
  {
    id: "digital-twin",
    title: "Digital twin",
    category: "Venue Operations & Security",
    body:
      "Each venue ran as a live 3D model fed by sensors and cameras, showing crowd movement, gate throughput and congestion build-up as it happened rather than after the fact.",
    source: { label: "Propmodo", url: "https://propmodo.com/what-fifa-deployed-at-the-2026-world-cup-is-a-preview-of-where-building-technology-is-heading/" },
  },
  {
    id: "facial-recognition",
    title: "AI facial recognition",
    category: "Venue Operations & Security",
    body:
      "Used for accreditation and access control at all 16 venues and, at participating stadiums, for ticketless entry and cashless payment - with biometrics tokenised into numerical values rather than stored as raw images.",
    source: { label: "Fares Solution", url: "https://faressolution.net/news/world-cup-tech-protection" },
  },
  {
    id: "security-robots",
    title: "Robotic security dogs",
    category: "Venue Operations & Security",
    body:
      "Camera-equipped quadruped robots patrolled perimeters at broadcast compounds and stadium exteriors, covering ground that would otherwise need standing human posts.",
    source: { label: "Fares Solution", url: "https://faressolution.net/news/world-cup-tech-protection" },
  },
  {
    id: "fifa-ai-pro",
    title: "FIFA AI Pro",
    category: "Player Performance & Welfare",
    body:
      "A hybrid and generative AI post-match analysis assistant built with Lenovo for all 48 teams - the point being to give squads without large analyst departments the same read on the data as the ones that have them.",
    source: { label: "The National Desk", url: "https://thenationaldesk.com/top-videos/digital-avatars-ref-cams-and-ai-world-cup-tech-takes-center-stage" },
  },
  {
    id: "epts",
    title: "EPTS (Electronic Performance & Tracking Systems)",
    category: "Player Performance & Welfare",
    body:
      "In-stadium optical tracking plus approved wearables delivering distance, sprint counts, top speeds and heat maps - the baseline layer nearly every other performance product at the tournament sits on top of.",
    source: { label: "FIFA", url: "https://inside.fifa.com/innovation/standards/epts" },
  },
  {
    id: "focus-concussion",
    title: "FOCUS concussion protocol",
    category: "Player Performance & Welfare",
    body:
      "A standardised rapid on-pitch assessment, developed by FIFA-nominated doctors, designed to rule concussion out quickly rather than diagnose it - pilot runtime around three minutes against the 56-second average head-injury check at Qatar 2022.",
    source: { label: "Medical Xpress", url: "https://medicalxpress.com/news/2026-07-soccer-concussion-protocol-game-hardest.html" },
  },
  {
    id: "social-media-protection",
    title: "Social media protection service",
    category: "Player Performance & Welfare",
    body:
      "FIFA's AI moderation layer scanned player and team accounts across the tournament, hiding abusive replies before they reached the athlete - over 53 million posts and comments processed.",
    source: { label: "FIFA", url: "https://inside.fifa.com/campaigns/no-discrimination/news/53-million-posts-comments-world-cup-2026-social-media-protection-service" },
  },
];

export const FTABR26_WORLDCUP = {
  eyebrow: "Feature",
  title: "FIFA WORLD CUP 2026",
  standfirst: "Technology took centre stage.",
  intro:
    "The 2026 FIFA World Cup, hosted across the United States, Canada and Mexico, marked a major step forward in football's technological evolution. With an expanded format of 48 teams and 16 host cities, technology proved crucial to keeping the tournament consistent, efficient and connected across three countries and 104 matches. From officiating systems and connected balls to enhanced tracking and in-stadium experiences, tech was embedded in every aspect of the tournament.",
  headline: {
    value: "$20.0B",
    label: "Estimated US economic impact",
    sublabel: "Bank of America's estimate; half of the $40.0B generated globally",
  },
  stats: [
    { value: "99.7%",  label: "Stadium occupancy",                            sublabel: "6.81M fans across 104 matches" },
    { value: "14.04M", label: "Average US viewers per match",                 sublabel: "Up 116.0% on Fox and 143.0% on Telemundo vs 2022" },
    { value: "13M GB", label: "Data across tournament and broadcast networks", sublabel: "Through the quarter-finals; over 161,000 km of fibre deployed" },
  ],
  techHeading: "Tech @ FIFA World Cup 26",
  tech: FTABR26_WORLDCUP_TECH,
} as const;

/* ── Featured company: Playermaker ───────────────────────────────────────
   Sits right after Top Trends, mirroring the NGSC panel in GSTER26. Copy is
   from the founder's submission; images live in
   client/public/reports/ftabr26/featured/. */

export const FTABR26_FEATURED = {
  name: "Playermaker",
  title: "The World’s First Foot-Worn Athlete Development System",
  subline: "Partner feature · Playermaker",
  brandColor: "#CF007F",
  url: "https://www.playermaker.com",
  cta: "Visit Playermaker",
  logo: "/reports/ftabr26/featured/playermaker-logo-white.webp",
  images: {
    lead:    { src: "/reports/ftabr26/featured/playermaker-strap.webp",  alt: "Player fitting the Playermaker sensor strap over a football boot" },
    product: { src: "/reports/ftabr26/featured/playermaker-shoe.webp",   alt: "Playermaker 2.0 sensor clipped to the heel of a white and pink football boot" },
    /* Photo strip under the main row */
    gallery: [
      { src: "/reports/ftabr26/featured/playermaker-kit.webp",    alt: "Player lacing a boot over a football beside the Playermaker box and sensor straps", position: "center 45%" },
      { src: "/reports/ftabr26/featured/playermaker-action.webp", alt: "Player wearing Playermaker sensors striking a football on grass", position: "center 55%" },
    ],
  },
  aboutLabel: "What Playermaker Solves",
  about: [
    "We all move from our feet, yet nobody ever taught us how to walk, run or cut. Playermaker is claiming the foot wearable opportunity.",
    "Its foot-worn motion tracking, proven with the world's best footballers, coaches any athlete, at any level, in any sport, to stop guessing and start knowing: developing talent and finding the small adjustments that unlock their best.",
  ],
  tagline: "WE INTEND TO OWN THE FOOT",
  founder: {
    name: "Guy Aharon",
    role: "CEO & Co-Founder",
    photo: "/reports/ftabr26/featured/playermaker-guy-aharon.webp",
  },
  achievementsLabel: "Key Achievements",
  achievements: [
    "The reference for foot-worn tracking: FIFA-certified and trusted by hundreds of elite clubs, federations and 100,000+ players.",
    "Physical AI, powered by proprietary wearables and a 30-billion-sample motion dataset, turning every step and touch into personal insight.",
    "Brought to consumers with Playermaker 2.0 and CITYPLAY, built with Manchester City.",
  ],
  nextLabel: "The Next 12–18 Months",
  next:
    "Expect Playermaker in more retail doors and more family homes worldwide, a deeper AI coach that tells every player what to work on next, and expansion into additional sports starting in 2027: the first step from football brand to the connected footwear category.",
} as const;

/* ── Startups to watch ──────────────────────────────────────────────────
   Snapshot of the companies flagged `in_ftabr26` in sm_test, kept as the
   fallback for /api/report/ftabr26/startups so the section still renders the
   right companies when the endpoint is unreachable. Regenerate rather than
   hand-edit: the flag in the database is the source of truth.
   ──────────────────────────────────────────────────────────────────────── */

export const FTABR26_STARTUPS: Ftabr26Startup[] = [
  {name: "Camb.ai", website: "http://camb.ai", country: "UAE", description: "AI Translation Platform", sector: "execs", logoUrl: null},
  {name: "Coaches' Voice", website: "http://learning.coachesvoice.com", country: "UK", description: "Sports education company on a mission to maximise the impact of coaching for millions of players worldwide", sector: "athletes", logoUrl: null},
  {name: "Data Sports Group", website: "http://datasportsgroup.com", country: "Germany", description: "Live sports data to media publishers & gaming segments", sector: "execs", logoUrl: null},
  {name: "Gamecode.ai", website: "http://gamecode.ai", country: "Germany", description: "Intelligence platform for elite-sports enabling decision-makers to convert their sporting identity into proprietary metrics and generate IP moats.", sector: "athletes", logoUrl: "https://goabdwczszjcmwakybkm.supabase.co/storage/v1/object/public/company_logos/gamecode_ai_1781599811182.svg"},
  {name: "Gemini Sports Analytics", website: "http://geminisports.ai", country: "USA", description: "supports organizations in the business of improving athlete welfare and enhancing performance.", sector: "execs", logoUrl: null},
  {name: "Marquee", website: "http://themarquee.ai", country: "USA", description: "360° view of every player with contextualized insights, letting you get back to what you do best: identifying the right talent", sector: "athletes", logoUrl: null},
  {name: "OLIVER Sports", website: "http://oliversports.ai", country: "Spain", description: "OLIVER Sports introduces the new generation of player performance monitoring technology, powered by AI", sector: "athletes", logoUrl: null},
  {name: "Output Sports", website: "http://outputsports.com", country: "Ireland", description: "One-stop tool for athlete performance optimisation", sector: "athletes", logoUrl: null},
  {name: "Playermaker", website: "http://playermaker.com", country: "UK", description: "Football performance tracker", sector: "athletes", logoUrl: null},
  {name: "Respo Vision", website: "http://respo.vision", country: "Poland", description: "AI football video analyser", sector: "athletes", logoUrl: null},
  {name: "ScorePlay", website: "http://scoreplay.io", country: "Portugal", description: "Sports club management software", sector: "execs", logoUrl: null},
  {name: "Soccerment", website: "http://soccerment.com", country: "Italy", description: "AI-powered football intelligence platform combining advanced analytics and video analysis for professional football (SICS+) and wearables (XSEED).", sector: "athletes", logoUrl: null},
  {name: "Sportswik", website: "http://sportswik.com", country: "Sweden", description: "Sportswik is a white-label platform enabling federations & leagues to boost coverage and engagement, generate new digital revenues and own their data.", sector: "fans", logoUrl: null},
  {name: "Sportvot", website: "http://sportvot.com", country: "India", description: "Platform for sport bodies & local sports to stream their games online", sector: "fans", logoUrl: null},
  {name: "Turf Coach", website: "http://turfcoach.com", country: "Germany", description: "Provides innovative hardware and software solutions for automatic data collection across your entire pitch. Monitor key turf parameters continuously and with ease!", sector: "execs", logoUrl: null},
  {name: "Zentag", website: "http://zentag.ai", country: "Germany", description: "Automates sports video highlights and replays", sector: "execs", logoUrl: null},
];

export const FTABR26_STARTUPS_NOTE =
  "We asked each innovator featured in this report to name a football tech startup that has impressed them recently. Based on their recommendations, input from our partner Match Ventures, and standout startups we're closely tracking, we've curated this list of startups to watch in football tech.";

/* ── Ecosystem (source pp25, 28, 31) ────────────────────────────────────── */

export type EcosystemEntry = { rank: number; name: string; hq: string; date?: string; url?: string };

export const FTABR26_INITIATIVES: EcosystemEntry[] = [
  { rank:  1, name: "PSG Labs",                                            hq: "Paris",     url: "https://en.psg.fr" },
  { rank:  2, name: "DFB Akademie",                                        hq: "Frankfurt", url: "https://dfb-akademie.de" },
  { rank:  3, name: "Polish Federation Innovation Hub",                    hq: "Warsaw",    url: "https://laczynaspilka.pl/innovation-hub" },
  { rank:  4, name: "The Faktory",                                         hq: "Alavés",    url: "https://baskoniaalaves.com/thefaktory" },
  { rank:  5, name: "Juventus Forward",                                    hq: "Turin" },
  { rank:  6, name: "Barça Innovation Hub",                                hq: "Barcelona", url: "https://barcainnovationhub.fcbarcelona.com" },
  { rank:  7, name: "Fan Engagement Startup Challenge (LaLiga x Sportboost)", hq: "Madrid" },
  { rank:  8, name: "Real Madrid Next",                                    hq: "Madrid",    url: "https://realmadridnext.com" },
  { rank:  9, name: "Atleti Lab",                                          hq: "Madrid",    url: "https://atletilab.com" },
  { rank: 10, name: "Sevilla FC Innovation Center",                        hq: "Sevilla",   url: "https://sevillafc.es" },
  { rank: 11, name: "Valencia CF Innovation Hub",                          hq: "Valencia" },
  { rank: 12, name: "CeltaLab1923",                                        hq: "Vigo",      url: "https://celtalab1923.es" },
  { rank: 13, name: "UEFA Innovation Hub",                                 hq: "Nyon" },
  { rank: 14, name: "FIFA Innovation Programme",                           hq: "Zurich",    url: "https://inside.fifa.com/innovation/innovation-programme" },
  { rank: 15, name: "Nummer 11",                                           hq: "Zeist",     url: "https://knvb.nl/campus/innovatie/nummer-11" },
  { rank: 16, name: "Burnley FC Innovation Hub",                           hq: "Burnley",   url: "https://innovation.burnleyfootballclub.com" },
];

export const FTABR26_ACCELERATORS: EcosystemEntry[] = [
  { rank: 1, name: "PSG and Station F",       hq: "Paris",         url: "https://en.psg.fr" },
  { rank: 2, name: "UEFA Champions Innovate", hq: "Munich" },
  { rank: 3, name: "Barça Startup Challenge", hq: "Barcelona",     url: "https://barcainnovationhub.fcbarcelona.com" },
  { rank: 4, name: "Start Cup by WFS",        hq: "Madrid" },
  { rank: 5, name: "MLS Innovation Lab",      hq: "New York City", url: "https://mlssoccer.com/innovationlab" },
];

export const FTABR26_EVENTS: EcosystemEntry[] = [
  { rank:  1, name: "Intelligence Sports Summit: Football", hq: "London",        date: "Sep 25" },
  { rank:  2, name: "World Football Summit Madrid",          hq: "Madrid",        date: "Oct 25" },
  { rank:  3, name: "Soccerex Miami",                        hq: "Miami",         date: "Nov 25" },
  { rank:  4, name: "Social Football Summit",                hq: "Rome",          date: "Nov 25" },
  { rank:  5, name: "Confut Nordeste",                       hq: "Recife",        date: "Dec 25", url: "https://confutnordeste.com.br" },
  { rank:  6, name: "World Football Summit Riyadh",          hq: "Riyadh",        date: "Dec 25" },
  { rank:  7, name: "SPOBIS",                                hq: "Hamburg",       date: "Feb 26" },
  { rank:  8, name: "FT Business of Football Summit",        hq: "London",        date: "Feb 26", url: "https://businessoffootball.live.ft.com" },
  { rank:  9, name: "FBIN Commercial Excellence Summit",     hq: "Budapest",      date: "Mar 26" },
  { rank: 10, name: "SportsInnovation",                      hq: "Düsseldorf",    date: "Mar 26" },
  { rank: 11, name: "Saudi Football Business Summit",        hq: "Riyadh",        date: "Apr 26" },
  { rank: 12, name: "Confut USA",                            hq: "New York City", date: "Jul 26", url: "https://confutusa.com" },
];

/* ── Partner spotlights (source pp7, 23) ────────────────────────────────── */

export type PartnerSpotlight = {
  id: string;
  kind: "Presenting Partner" | "Startup Partner";
  name: string;
  tagline: string;
  url: string;
  contact: { name: string; role: string };
  blocks: { heading: string; body: string }[];
};

export const FTABR26_PARTNERS: PartnerSpotlight[] = [
  {
    id: "gradient-sports",
    kind: "Presenting Partner",
    name: "Gradient Sports",
    tagline: "Full-spectrum football analysis driven by the most complete dataset",
    url: "https://gradientsports.com",
    contact: { name: "Nate Gerstle", role: "Chief Executive Officer" },
    blocks: [
      { heading: "What problem do you solve?", body: "At Gradient, we eliminate uncertainty in high-performance football environments. The modern game demands strategic, data-driven decisions, and our analysis provides the clarity to make them. We transform complex data into forward-looking insights that empower professionals, media, and fans to think ahead, act decisively, and gain a lasting edge. From player evaluations to physical benchmarking, we equip decision-makers with the tools to navigate complexity and shape outcomes with confidence." },
      { heading: "Key achievements", body: "One of our key initiatives has been the launch of our “Player Grades Alpha Program”, where we've partnered with several Premier League clubs, and others across Europe's Big 5, to validate and adapt our NFL-proven grading methodology for association football. Gradient officially split from PFF in May 2024 and rebranded in June 2025. Our focus is now solely on the global game, and we remain proudly powered by PFF." },
      { heading: "Next 12–18 months", body: "Gradient is focused on global expansion and product growth. We're scaling our Player Grades beyond the Premier League to cover all top five European leagues and more international competitions. Our physical and enhanced broadcast tracking data coverage now spans 56 competitions and is rapidly growing. We're also launching a consumer app designed to deepen fan engagement ahead of the 2026 World Cup." },
      { heading: "What are you looking for?", body: "Gradient is in a high-growth phase and actively seeking partners who share our vision for the future of football intelligence. We're open to new, strategic investment to support product expansion and global coverage, growing our team, and pursuing strategic relationships with the right club, media, technology, and federation partners." },
    ],
  },
  {
    id: "coachwhisperer",
    kind: "Startup Partner",
    name: "Coachwhisperer",
    tagline: "Live communication for coaches and athletes",
    url: "https://coachwhisperer.de",
    contact: { name: "Julien Pascal Then", role: "CEO & Founder" },
    blocks: [
      { heading: "What problem do you solve?", body: "During training execution, communication challenges are a major obstacle. Feedback from coaches must frequently be delivered across large distances, forcing coaches to interrupt the session and losing flow and efficiency. Our intercom system enables a discrete communication channel between coaches and players on the pitch. Our Wi-Fi based solution allows communication with individual players, specific groups or the entire team in real time." },
      { heading: "Key achievements", body: "During our market entry phase this year, we acquired our first partners from the Bundesliga and the Premier League. Recently we launched our LiveTranslate feature, which bridges language barriers during training sessions by automatically translating coach instructions for players." },
      { heading: "Next 12–18 months", body: "With our Coaching Behaviour Analysis feature, our SaaS coaching evaluation tool, we want to provide organisations with valuable insights about their coaching performance based on collected audio data. Our goal for the next 12–18 months is to expand into additional European markets, and we are preparing to raise a Seed+ round." },
    ],
  },
  {
    id: "goal-station",
    kind: "Startup Partner",
    name: "Goal Station by A-Champs",
    tagline: "Built for elite performance",
    url: "https://a-champs.com",
    contact: { name: "Roland Biro", role: "Head of Sales and Business Development" },
    blocks: [
      { heading: "What problem do you solve?", body: "Modern football demands more than technical skills and fitness. It requires a fast, intelligent brain. Goal Station develops Football IQ through high-repetition, high-intensity drills that sharpen perception, scanning, and decision-making. Coaches benchmark skills, track progress, and build data-driven Individual Development Plans." },
      { heading: "Key achievements", body: "Goal Station is trusted by over 50.0% of Bundesliga clubs and more than 40.0% of Danish Superliga teams. We've been recognised by MLS and LaLiga as one of football's most innovative startups, and our system is backed by multiple international patents." },
      { heading: "Next 12–18 months", body: "We'll launch strategic partnerships with thought leaders from the Premier League, MLS, and NWSL. As part of our U.S. expansion, we're installing the first Goal Station Arenas on American soil, building on our network of 24 in Denmark. In partnership with Sogility, we'll also introduce a new at-home training solution." },
    ],
  },
];

// Retained for compatibility with previously cached report modules.
// The FTABR26 page no longer renders the closing quote section.
export const FTABR26_CLOSING_QUOTE =
  "The money has arrived, the tech is here. Now comes the harder part: figuring out what works.";

export const FTABR26_METHODOLOGY = {
  intro:
    "The data in this report was obtained by reviewing thousands of startups and funding deals in global sports tech. The deal period covered is Jan 1, 2021 - Jun 30, 2026. Companies founded before the year 2000 are excluded unless otherwise stated. All deals are reported in USD; for deals not in USD, the average conversion rate for the deal currency in the deal year was used. As far as possible, we source public-domain information for all deals included.",
  categories: [
    { name: "Football Only", description: "Startups and solutions focused solely on football. Their products, services, and technology are built specifically for the football ecosystem.", examples: "Sorare, OneFootball, TOCA Football" },
    { name: "Football Also", description: "Multisport startups that include football as part of their broader offering, serving football alongside other sports.", examples: "DAZN, Teamworks, Genius Sports" },
  ],
} as const;

export const FTABR26_IMPRINT = {
  author: "Rohn Malhotra",
  company: "SportsTechX GmbH",
  address: "Liebigstr. 35, 10247 Berlin, Germany",
  contact: "www.sportstechx.com / hello@sportstechx.com",
  note: "The content in this report is for general information purposes only and can change at any time. SportsTechX cannot guarantee the ultimate accuracy or completeness of the data.",
} as const;
