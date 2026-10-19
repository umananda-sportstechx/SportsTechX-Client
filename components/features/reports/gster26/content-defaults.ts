// @ts-nocheck
/* eslint-disable */
import { BRAND } from './brand';

export const INNOVATOR_RESPONSES_DEFAULT: Record<string, { q_innovators?: string; q_investors?: string; q_sports_orgs?: string }> = {
  "Alexander Janssen": {
    q_innovators: "Sports with limited scaling opportunities, niche sports like mountaineering, water sports, fight sports and disability sports amongst others.",
    q_investors:  "AI, (health/safety) predictive tools and longevity.",
    q_sports_orgs: "Fan engagement, small scale sports (smaller versions of traditional sports) and sports community solutions.",
  },
  "Anatoly Evdokimov": {
    q_investors: "We observe clear shift from flashy headlines and \u201Cfollowing the crowd\u201D to result oriented approach across all subsectors of sports tech. Startups which bring clear observable value to their customers will win clients and investors attention.",
  },
  "Carolina Chiappero": {
    q_sports_orgs: "Sports organizations are 360° systems, and innovation can serve multiple areas. Real opportunity lies in solving concrete needs, because real problems enable real solution deployment. We actively seek innovation across three operational domains: On the Pitch (performance), Inside the Club (process, data, smart stadium), and Beyond the Pitch (digital, media, fan).",
  },
  "Chad Wilton": {
    q_innovators: "The next billion-dollar sportstech company won't be a wearable, it will be the 'Stripe + Salesforce + Snowflake' for sports. Teams still operate on disconnected legacy systems. Whoever unifies ticketing, sponsorship, and media into real-time commercial decisions will fundamentally change how organizations scale revenue and operate.",
  },
  "Dilip Kumar": {
    q_investors: "AI led coaching and computer vision will democratise elite training. Wearables will shift from step tracking to real performance diagnostics. Tech enabling participatory sports making everyday athletes measurable, competitive, and community driven.",
  },
  "Dr. Hendrik Weber": {
    q_sports_orgs: "3D data indeed has transformative potential across all levels of the ecosystem — leagues, clubs, players, and data providers alike. In a world built on full 3D tracking from day one, it would feel almost absurd that every fan receives the same broadcast.",
  },
  "Jeffrey Hintz": {
    q_innovators: "Grassroots and community sports remain significantly underserved by modern technology. Core functions like scheduling, facilities management, volunteer coordination, and local sponsorship are still fragmented and manual. Scalable platforms that professionalize these ecosystems could unlock participation growth, better data, and more sustainable local sports economies.",
  },
  "Juan Fuentes Fernández": {
    q_innovators: "In terms of markets, elite sports are well served, but the wider ecosystem remains overlooked. I see strong opportunities in grassroots sports. In terms of segments, I see a growing demand for injury‑prevention technologies that address emerging structural problems in professional sports, such as injuries caused by calendar‑driven overload.",
  },
  "Koen Bosma": {
    q_innovators: "Youth sports in Europe. Youth competitions have been run the same way for 50+ years and declining participation rates (mostly for teenagers) should create enough opportunity to re-think how we should go about youth sports.",
    q_investors:  "There will be 2 interesting area's. Firstly, there will continued focus on collecting proprietary data about the human body. Secondly, there will be AI models that will translate that data into actionable insights. So in short, the shift from measurement to intervention on human health and performance.",
  },
  "Lloyd Danzig": {
    q_investors: "We are excited about technologies that drive lean-forward engagement around competitive entertainment.",
  },
  "Mike Kurt": {
    q_innovators: "In the field of television production for major events and sports properties, I see substantial potential for disruption over the coming years, particularly with regard to achieving meaningful cost efficiencies.",
    q_sports_orgs: "We are specifically seeking solutions that have the potential to support compelling commercial use cases and enable sustainable, long-term business models. At present, our members (the national federations) are facing challenges in developing business cases that address clearly defined problems with tangible economic relevance.",
  },
  "Rebecca Hopkins": {
    q_innovators: "Educating those who control budgets. Sports technology is booming, but purchasing decisions often sit with leaders whose expertise lies elsewhere. Without deeper understanding of capability and value, organizations underinvest or misinvest in technology. Better purchasing through better knowledge could reshape how sport adopts innovation.",
  },
};
export const watchInnovators_DEFAULT: WatchCompany[] = [
  { name: "Oura", description: "Smart ring wearable delivering sleep, recovery and readiness insights for athletes and consumers", why: "Category-defining form factor with clinical-grade accuracy , setting the standard for passive health monitoring in sport.", domain: "ouraring.com", city: "Oulu", country: "Finland", countryFlag: "", sector: "athletes" },
  { name: "Whoop", description: "Continuous physiological monitoring platform with strain, recovery and sleep coaching", why: "Subscription-first hardware model proved wearables can scale without retail , now embedded in NFL, MLB and PGA Tour.", domain: "whoop.com", city: "Boston", country: "USA", countryFlag: "", sector: "athletes" },
  { name: "Sportradar", description: "Global sports data and technology company powering betting, media and integrity solutions", why: "Unmatched data moat across 900k+ events/year , the connective tissue between leagues, broadcasters and sportsbooks.", domain: "sportradar.com", city: "St. Gallen", country: "Switzerland", countryFlag: "", sector: "execs" },
  { name: "Catapult Sports", description: "Athlete performance analytics through GPS tracking, video and wearable technology", why: "Acquired PlayerTek and XOS Digital to own the full athlete monitoring stack , hardware, video and analytics in one.", domain: "catapultsports.com", city: "Melbourne", country: "Australia", countryFlag: "", sector: "athletes" },
  { name: "Genius Sports", description: "Official data, technology and commercial partner powering the global sports ecosystem", why: "Exclusive NFL and Premier League data rights make them the gatekeeper for next-gen betting and media products.", domain: "geniussports.com", city: "London", country: "UK", countryFlag: "", sector: "execs" },
  { name: "Pixellot", description: "AI-automated sports production technology democratizing live sports broadcasting", why: "Over 30,000 cameras deployed , more than any sports broadcaster. Unlocking content from games that were never filmed before.", domain: "pixellot.tv", city: "Petah Tikva", country: "Israel", countryFlag: "", sector: "fans" },
  { name: "StatusPRO", description: "XR training platform using NFL player tracking data for immersive quarterback simulation", why: "Only company with licensed NFL Next Gen Stats data in VR , turning real game film into trainable simulations.", domain: "statuspro.com", city: "Little Rock", country: "USA", countryFlag: "", sector: "athletes" },
  { name: "Sorare", description: "Fantasy sports platform built on blockchain offering NFT player cards and tournaments", why: "Signed licensing deals with 300+ clubs and leagues including LaLiga, MLB and NBA , bridging crypto-native gaming with mainstream sport.", domain: "sorare.com", city: "Paris", country: "France", countryFlag: "", sector: "fans" },
  { name: "Zone7", description: "AI-powered injury prediction platform helping pro teams reduce soft-tissue injuries by 50%+", why: "Used by 100+ elite teams , proven ROI in reducing injuries worth millions in player salary protection.", domain: "zone7.ai", city: "Tel Aviv", country: "Israel", countryFlag: "", sector: "athletes" },
  { name: "Playmaker", description: "Digital sports media company operating fan-focused brands across multiple global markets", why: "Aggregating niche sports audiences at scale through acquisitions , building a new-media empire outside traditional broadcast.", domain: "playmaker.fans", city: "Toronto", country: "Canada", countryFlag: "", sector: "fans" },
];
export const watchPeak_DEFAULT: WatchCompany[] = [
  { name: "KinetiQ", description: "KinetiQ is the intelligence infrastructure platform behind human movement health , leveraging AI and 3D scanning on smartphones to provide lab-grade real-time exercise analysis to enable scale and performance gains across rehabilitation, performance and scouting in elite sport.", why: "PEAK Startup World Cup Finalist , For Athletes", domain: "kinetikiq.com", city: "TBC", country: "TBC", countryFlag: "", sector: "athletes" },
  { name: "Spoda", description: "Spoda AI delivers autonomous sports analysts, starting with a market-leading engine for Cricket. We provide a predictive data stack powering immersive fan engagement, grassroots analytics, and high-accuracy insights for fantasy and betting. Having achieved strong PMF, we are now scaling our proprietary AI across global sports and geographies.", why: "PEAK Startup World Cup Finalist , For Athletes", domain: "spoda.com", city: "TBC", country: "TBC", countryFlag: "", sector: "athletes" },
  { name: "Staxy", description: "STAXY is an AI-powered mobility platform helping sports organisations optimise fan travel. By integrating matchday transport into club apps, it delivers actionable insights, reduces costs, increases revenue, and improves fan experience at scale.", why: "PEAK Startup World Cup Finalist , For Athletes", domain: "staxy.io", city: "TBC", country: "TBC", countryFlag: "", sector: "athletes" },
  { name: "Scoutz", description: "Scoutz is a global recruiting platform connecting athletes with teams and scouts through AI-driven matchmaking and verified profiles. Partnering with NBA G League teams and brands like Puma and ANGT, it helps scale athlete discovery and modernise recruitment pathways.", why: "PEAK Startup World Cup Finalist , For Fans", domain: "scoutz.com", city: "TBC", country: "TBC", countryFlag: "", sector: "fans" },
  { name: "Rival", description: "Rival turns fandom into a game. We partner with leagues, teams, and brands to build owned, white-labeled digital arenas where fans compete through video games, mini-games, predictions, tournaments, and more - turning play into an engagement engine that captures first-party data and unlocks new monetization opportunities.", why: "PEAK Startup World Cup Finalist , For Fans", domain: "rival.com", city: "TBC", country: "TBC", countryFlag: "", sector: "fans" },
  { name: "Catch", description: "Catch is the modern operating platform for sports teams and venues, unifying their leading Point of Sale, mobile ordering, and front office systems into one solution. By replacing fragmented tools and systems, Catch delivers real-time insights and AI-driven analytics, helping organizations unlock new revenue and operate more efficiently.", why: "PEAK Startup World Cup Finalist , For Fans", domain: "letscatch.com", city: "TBC", country: "TBC", countryFlag: "", sector: "fans" },
  { name: "Theo Health", description: "Theo Health is building smart clothing that delivers lab-grade biomechanical insight during real training. Founded by former Scottish soccer champion Jodie Sinclair after a career-ending ACL injury, Theo equips performance teams with real-time movement analysis to prevent injuries, optimise performance, and improve return-to-play decisions.", why: "PEAK Startup World Cup Finalist , For Executives", domain: "theohealth.com", city: "TBC", country: "TBC", countryFlag: "", sector: "execs" },
  { name: "SuperQuickQuestion", description: "SuperQuickQuestion delivers live, one-minute video experiences connecting fans directly with athletes and celebrities , at scale, with zero travel required.", why: "PEAK Startup World Cup Finalist , For Executives", domain: "superquickquestion.com", city: "TBC", country: "TBC", countryFlag: "", sector: "execs" },
  { name: "MVEO", description: "Mveo deploys on-premise AI agents that control existing cameras and understand the action from every angle. Our system generates simultaneous 16:9 broadcast and 9:16 native mobile live feeds, along with customized outputs per broadcaster, enabling events to maximize reach and engagement across fragmented audiences.", why: "PEAK Startup World Cup Finalist , For Executives", domain: "mveosports.com", city: "TBC", country: "TBC", countryFlag: "", sector: "execs" },
];
export const PEAK_SWC_FINALISTS_DEFAULT = {
  athletes: [
    { name: "KinetiQ", domain: "kinetikiq.com" },
    { name: "Spoda", domain: "spoda.ai" },
    { name: "Staxy", domain: "staxy.live" },
  ],
  fans: [
    { name: "Scoutz", domain: "scoutzapp.com" },
    { name: "Rival", domain: "rivalx.com" },
    { name: "Catch", domain: "letscatch.com" },
  ],
  executives: [
    { name: "Theo Health", domain: "theohealth.com" },
    { name: "SuperQuickQuestion", domain: "superquickquestion.com" },
    { name: "MVEO", domain: "mveo.ai" },
  ],
};
export const GROUNDBREAKERS_ORGS_DEFAULT = [
  { name: "FIFA", domain: "fifa.com" },
  { name: "US Soccer", domain: "ussoccer.com" },
  { name: "WTT", domain: "worldtabletennis.com" },
  { name: "Sevilla FC", domain: "sevillafc.es" },
  { name: "Villarreal CF", domain: "villarrealcf.es" },
  { name: "LaLiga", domain: "laliga.com" },
  { name: "BVB", domain: "bvb.de" },
];
export const PEAK_PARTNERS_TIER1_DEFAULT = [
  { name: "NBA", logo: "/peak-logos/NBA@456-tiny.webp" },
  { name: "UFC", logo: "/peak-logos/5-UFC@2x.webp" },
  { name: "PSG", logo: "/peak-logos/Paris-Saint-Germain@2x.webp" },
  { name: "San Francisco 49ers", logo: "/peak-logos/San-Francisco-49ers@2x.webp" },
  { name: "MLS", logo: "/peak-logos/MLS@2x.webp" },
  { name: "NASCAR", logo: "/peak-logos/Nascar@2x.webp" },
  { name: "PGA", logo: "/peak-logos/39-PGA@2x.webp" },
  { name: "MotoGP", logo: "/peak-logos/MotoGP-new@2x.webp" },
];
export const PEAK_PARTNERS_TIER2_DEFAULT = [
  { name: "Sportradar", logo: "/peak-logos/34-SportRadar@2x.webp" },
  { name: "WSC Sports", logo: "/peak-logos/9-WSC-Sports@2x.webp" },
  { name: "TeamworkOnline", logo: "/peak-logos/TeamworkOnline@456-tiny.webp" },
  { name: "Hudl", logo: "/peak-logos/HUDL@2x-1.webp" },
  { name: "GameChanger", logo: "/peak-logos/Gamechanger.webp" },
  { name: "Pixellot", logo: "/peak-logos/Pixellot@2x.webp" },
  { name: "TeamSnap", logo: "/peak-logos/7-TeamSnap@2x.webp" },
  { name: "TIXR", logo: "/peak-logos/Tixr@2x.webp" },
];
export const PEAK_PARTNERS_TIER3_DEFAULT = [
  { name: "Courtside VC", logo: "/peak-logos/11-Courtside-VC@2x.webp" },
  { name: "SeventySix Capital", logo: "/peak-logos/23-SeventySix-Capital@2x.webp" },
  { name: "Permira", logo: "/peak-logos/Permira@456-tiny.webp" },
  { name: "TMRW Sports", logo: "/peak-logos/TMRWSports@456-tiny.webp" },
  { name: "KB Partners", logo: "/peak-logos/28-KB-Partners@2x-1.webp" },
  { name: "Ryan Sports Ventures", logo: "/peak-logos/Ryan-Sports-Ventures@2x.webp" },
  { name: "LEAD", logo: "/peak-logos/22-LEAD@2x.webp" },
  { name: "Plug and Play", logo: "/peak-logos/Plug-and-Play@2x.webp" },
];
export const watchStxRecommends_DEFAULT: WatchCompany[] = [
  { name: "Uplift Labs", description: "Markerless 3D motion capture from smartphone video for biomechanics and performance analysis", why: "Turning any smartphone into a biomechanics lab , democratizing movement analysis previously locked behind $100k+ systems.", domain: "upliftlabs.com", city: "San Francisco", country: "USA", countryFlag: "", sector: "athletes" },
  { name: "Athliance", description: "NIL compliance and monitoring platform helping universities manage athlete endorsement deals", why: "NIL regulations are a compliance minefield , Athliance is the infrastructure layer universities can't operate without.", domain: "athliance.com", city: "Nashville", country: "USA", countryFlag: "", sector: "execs" },
  { name: "Sponix Tech", description: "Volumetric video and holographic replay technology for immersive sports broadcasting", why: "Holographic replays from standard broadcast cameras , the kind of visual storytelling that will redefine sports media.", domain: "sponixtech.com", city: "Tehran", country: "Iran", countryFlag: "", sector: "fans" },
  { name: "MoveSense", description: "Open sensor platform for building wearable solutions in sports, health and wellness", why: "Open platform approach means anyone can build sport-specific wearables on proven medical-grade hardware.", domain: "movesense.com", city: "Oulu", country: "Finland", countryFlag: "", sector: "athletes" },
  { name: "Rezzil", description: "VR cognitive training platform used by elite football clubs to sharpen decision-making", why: "Used by Manchester United and PSG , proving VR can train the brain, not just the body, for elite performance.", domain: "rezzil.com", city: "Manchester", country: "UK", countryFlag: "", sector: "athletes" },
  { name: "OneFootball", description: "Football media platform aggregating live scores, news and streaming for 100M+ fans globally", why: "100M+ users and growing , becoming the super-app for football content that sits between social media and broadcasters.", domain: "onefootball.com", city: "Berlin", country: "Germany", countryFlag: "", sector: "fans" },
  { name: "Arcade1Up", description: "At-home arcade and interactive sports gaming bringing retro and licensed sports experiences to consumers", why: "Nostalgia meets interactive sport , tapping into the home entertainment boom with licensed NBA, NFL and NHL cabinets.", domain: "arcade1up.com", city: "Chicago", country: "USA", countryFlag: "", sector: "fans" },
  { name: "SciSports", description: "Football intelligence platform combining data analytics, recruitment tools and performance insights", why: "Quietly powering scouting departments across top European leagues , their recruitment model is becoming industry standard.", domain: "scisports.com", city: "Amersfoort", country: "Netherlands", countryFlag: "", sector: "execs" },
  { name: "ElMo Tech", description: "Electromagnetic motion tracking delivering sub-millimetre accuracy for athlete biomechanics", why: "Sub-millimetre accuracy in a portable package , filling the gap between lab-grade mocap and field-deployable tracking.", domain: "elmo-tech.com", city: "Yokneam", country: "Israel", countryFlag: "", sector: "athletes" },
  { name: "Pico", description: "Mobile-first fan engagement and data capture platform helping sports properties grow direct relationships", why: "First-party fan data is the new gold , Pico helps properties own their audience relationship instead of renting it from social.", domain: "pico.tools", city: "Tel Aviv", country: "Israel", countryFlag: "", sector: "fans" },
];
export const FEATURED_ARTICLES_DEFAULT: FeaturedArticle[] = [
  {
    id: "pe-ownership",
    tag: "PRIVATE EQUITY",
    title: "HOW PE GOT INTO SPORT",
    intro: "The two-decade story of how private equity broke into professional sport and what gets lost when the floodgates open.",
    summary: "The two-decade story of how private equity broke into professional sport and what gets lost when the floodgates open.",
    statCards: [
      { value: "2005", label: "The year CVC cracked open the asset class", sublabel: "F1 is first institutional acquisition of an entire sports property" },
      { value: "31–1", label: "NFL owners' vote to allow PE in August 2024", sublabel: "The last and most valuable league finally said yes" },
      { value: "$23.6B", label: "Total sports club deal value by August 2025", sublabel: "Prior annual record surpassed by 42% within months of the NFL vote" },
    ],
    bodyParagraphs: [],
    sections: [
      {
        heading: "HOW WE GOT HERE",
        paragraphs: [
          "THE ASSET WAS ALWAYS EXCEPTIONAL , Scarce supply, loyal customers, recession-resistant demand, and media rights generating predictable long-term cashflows. Institutional capital could see all the benefits but couldn't get in. Deliberately kept out by the leagues for decades. Individual owners, family approvals, and no standardised frameworks meant the doors to this exceptional asset class were locked. Not by accident.",
          "THE FIRST CRACKS , Bain Capital tried to buy all 30 NHL teams in 2005 and was rejected but it put PE on the radar. CVC then stepped up: acquired Formula 1 outright for $2 billion in 2005–06, transformed it into a global entertainment platform, sold to Liberty Media for $8 billion in 2016. The thesis was proven , sports properties could generate institutional-grade returns when run with commercial discipline. A year later, three US PE funds bought into PSG, the first club-level deal in European football. Both moves were isolated. The industry was watching closely.",
          "THE POLICY DAM BREAKS , MLB codified PE ownership rules in 2019 , the first North American league to do so. The NBA, NHL, and MLS followed within two years. Arctos, RedBird, and Sixth Street moved in and began building multi-sport portfolios. The NFL, the most valuable sports property on earth, held out until August 2024, when owners voted 31–1 to allow pre-approved funds to buy passive stakes capped at 10% per team. The final door opened.",
        ],
      },
      {
        heading: "WHERE WE ARE TODAY",
        paragraphs: [
          "THE VALUATION BOOM , The NFL vote didn't just open one more league. It confirmed the asset class. The Celtics sold for $6.1 billion in March 2025. The Lakers went for $10 billion three months later. Total deal value hit $23.6 billion by August 2025, surpassing the prior annual record by 42%. February 2026 saw KKR acquire Arctos for $1.4 billion. A $744 billion AUM firm paying that price for a sports investing platform isn't a bet on the future. It's a statement about the present.",
        ],
      },
      {
        heading: "THE TENSION UNDERNEATH",
        paragraphs: [
          "The same logic that makes sports attractive to PE , loyal fanbases, emotional attachment, decades of institutional identity , is precisely what's at risk. PE funds operate on defined return horizons. Football clubs were built over generations. Ticket price inflation, commercial oversaturation, fixture congestion: the pressure points are predictable, and some are already visible.",
          "Fans don't support balance sheets. They support clubs that will outlast them. That's the thing PE is buying. And the thing it could spend.",
        ],
      },
    ],
    timeline: [
      { year: "2003", event: "Abramovich buys Chelsea FC", detail: "~£140M , proved clubs were buyable assets" },
      { year: "2005", event: "Bain offers $4B for all 30 NHL teams", detail: "Rejected, but put PE on the radar" },
      { year: "2005–06", event: "CVC acquires Formula 1 for $2B", detail: "First PE acquisition of an entire sports property" },
      { year: "2006", event: "Three US PE funds acquire PSG", detail: "First club-level PE deal in European football" },
      { year: "2010", event: "FSG acquires Liverpool FC", detail: "Portfolio logic applied to European football" },
      { year: "2016", event: "Liberty Media buys F1 from CVC for $8B", detail: "CVC proves the thesis , 4x return" },
      { year: "2019", event: "MLB formalises PE ownership rules", detail: "First North American league to codify access" },
      { year: "2019", event: "Silver Lake takes 10% of City Football Group", detail: "$500M , first PE bet on multi-club ownership" },
      { year: "2020–21", event: "NBA, NHL, MLS open to PE", detail: "Three leagues follow MLB within two years" },
      { year: "2022", event: "RedBird acquires AC Milan", detail: "€1.2B , US PE applies portfolio strategy to a top European club" },
      { year: "Aug 2024", event: "NFL votes 31–1 to allow PE", detail: "Last major league opens , Ares, Arctos, Sixth Street, Blackstone, Carlyle, CVC approved" },
      { year: "Mar 2025", event: "Celtics sell for $6.1B", detail: "Record valuation , broken within months" },
      { year: "Jun 2025", event: "Lakers sell for $10B", detail: "Highest franchise valuation in history" },
      { year: "Aug 2025", event: "Deal volume hits $23.6B", detail: "Prior annual record surpassed by 42%" },
      { year: "Feb 2026", event: "KKR acquires Arctos for $1.4B", detail: "$744B AUM firm absorbs sports investing pioneer" },
    ],
    firms: [
      { name: "Arctos Partners", domain: "arctospartners.com", desc: "Built the multi-sport minority stake playbook , passive, diversified minority stakes across all five major North American leagues. KKR's $1.4 billion acquisition tells you how well it worked." },
      { name: "RedBird Capital Partners", domain: "redbirdcap.com", desc: "Takes the opposite approach , buy control positions in under-monetised sports IP, professionalise the commercial operation, extract value. Founded on the YES Network deal , $335 million in, sold at over $3 billion. Now hold AC Milan, Fenway Sports Group, Alpine F1, and the UFL with an expected push into college sports." },
      { name: "CVC Capital Partners", domain: "cvc.com", desc: "Went bigger than all of them: buying stakes in entire leagues. After the Formula 1 exit, now hold stakes in LaLiga, Ligue 1, Six Nations Rugby, WTA, and more. All consolidated into Global Sport Group, its $13.6 billion sports division formed in 2025." },
    ],
    color: BRAND.navy,
  },
  {
    id: "nba-europe",
    tag: "NBA EUROPE",
    title: "THE NBA COMES TO EUROPE",
    intro: "",
    summary: "A 16-team league launching October 2027 , the most structurally ambitious expansion in the NBA's history.",
    statCards: [
      { value: "1 in 6", label: "Current NBA players who are European", sublabel: "Five of the last seven MVP awards won by European-born players" },
      { value: "$500M–$1B", label: "Projected franchise fee per team", sublabel: "Before a single game is played" },
      { value: "16", label: "Permanent franchises across Europe's major cities", sublabel: "London, Paris, Madrid, Berlin, Milan, Istanbul and more" },
    ],
    bodyParagraphs: [],
    sections: [
      {
        heading: "HOW WE GOT HERE",
        paragraphs: [
          "THE TALENT PIPELINE EUROPE BUILT , Roughly one in six current NBA players is European. Five of the last seven MVP awards went to players who grew up in European basketball systems. The NBA's best players increasingly learned the game in a system the NBA has no structural relationship with and no commercial stake in. That was always likely to change.",
          "THE INFRASTRUCTURE EUROPE FAILED TO BUILD , European basketball produces world-class talent, not world-class commercial infrastructure. The EuroLeague attracts serious basketball but not serious money. Domestic leagues are fragmented. Arenas are outdated. Broadcast deals are a fraction of US sports and European Football. A continent of 700 million potential fans, a generation of homegrown superstars, and a structurally underdeveloped market. There is an obvious gap.",
          "THE ANNOUNCEMENT , After protracted negotiations with the EuroLeague, in March 2025, the NBA and FIBA announced they were moving forward with a new professional basketball league in Europe, targeting an October 2027 launch. The planned 16-team format calls for 12 permanent franchises across target cities (see map). JPMorgan Chase and the Raine Group are advising on the process. Dozens of prospective ownership groups are already under NDAs reviewing financial projections.",
        ],
      },
      {
        heading: "WHAT'S AT STAKE",
        paragraphs: [
          "THE FRANCHISE ECONOMICS , Entry fee alone is a nine-figure commitment , projected between $500 million and $1 billion per franchise, before a single game is played. The Celtics ($6.1B) and Lakers ($10B) sales reset expectations on what NBA equity is worth. European franchises are starting lower, but the trajectory is the point. Adam Silver has been explicit: this is not a short-term investment.",
          "THE COMPETITIVE DISRUPTION , The EuroLeague faces direct competition for clubs, talent, and commercial partners simultaneously. New arenas will need to be built. Broadcast deals negotiated from scratch. The existing ecosystem does not slot neatly into the NBA's structure. What gets absorbed, what gets displaced, and what gets built from zero are all still live questions.",
          "THE SPORTS TECH OPPORTUNITY , A 16-team league built from scratch needs everything. Ticketing, analytics, broadcast production, fan engagement platforms, arena technology, none of it exists yet. No legacy systems or entrenched vendor relationships, NBA Europe will be building its entire operational stack in a compressed timeframe, across multiple languages and jurisdictions. That is a genuinely rare greenfield opportunity for sports tech companies positioned to move fast.",
        ],
      },
    ],
    prosConsQuestion: "So, will it work? Your vote?",
    pros: [
      { label: "Market", detail: "The talent is already European. The stars exist. The home market product doesn't." },
      { label: "Clean Slate", detail: "Greenfield means no legacy costs, no entrenched vendors, no inherited problems." },
      { label: "Opportunity", detail: "Franchise fees look steep until you track where NFL and NBA valuations went post-opening." },
      { label: "Playbook", detail: "The NBA has built this before. The blueprint exists." },
    ],
    cons: [
      { label: "Fan Acceptance", detail: "European fans support century-old clubs, not investor-created franchises." },
      { label: "Competition", detail: "The EuroLeague will fight for every club, broadcaster, and sponsor simultaneously." },
      { label: "Resources", detail: "New arenas across multiple jurisdictions, planning laws, and political environments have broken better-funded initiatives." },
      { label: "Scale", detail: "Execution at this scale, across this many markets, has never been attempted." },
    ],
    mapCities: [
      { name: "Paris",      lon: 2.35,   lat: 48.86 },
      { name: "London",     lon: -0.12,  lat: 51.51 },
      { name: "Manchester", lon: -2.24,  lat: 53.48 },
      { name: "Madrid",     lon: -3.70,  lat: 40.42 },
      { name: "Barcelona",  lon: 2.17,   lat: 41.39 },
      { name: "Rome",       lon: 12.50,  lat: 41.90 },
      { name: "Milan",      lon: 9.19,   lat: 45.46 },
      { name: "Berlin",     lon: 13.40,  lat: 52.52 },
      { name: "Munich",     lon: 11.58,  lat: 48.14 },
      { name: "Lyon",       lon: 4.83,   lat: 45.76 },
      { name: "Athens",     lon: 23.73,  lat: 37.98 },
      { name: "Istanbul",   lon: 28.98,  lat: 41.01 },
    ],
    color: BRAND.tealBright,
  },
  {
    id: "who-owns-upside",
    tag: "ATHLETE ECONOMICS",
    title: "WHO HOLDS THE POWER",
    intro: "The way athletes get paid determines who has power, who carries risk, and who actually gets rich.",
    summary: "How three payment models , franchise, tour, promoter , determine who holds power, who carries risk, and who gets rich in sport.",
    statCards: [
      { value: "17%", label: "Share of UFC revenue that goes to fighters", sublabel: "NBA players, protected by decades of collective bargaining, receive 50%" },
      { value: "$153M", label: "Increase in PGA Tour prize money within one season of LIV Golf launching", sublabel: "A rival league forced a century-old structure to reset" },
      { value: "$375M", label: "UFC antitrust settlement, 2025", sublabel: "A decade of fighting for the right to fight back" },
    ],
    bodyHeading: "THE STRUCTURE DECIDES",
    bodyParagraphs: [
      "Cristiano Ronaldo earns his wage whether he scores or sits injured in the stands. Novak Djokovic earns nothing from competition the weeks he doesn't play, for any reason.",
      "Two of the greatest athletes of their generation \u2014 opposite financial realities. The difference isn't talent or fame. It's the structure their sport chose.",
      "Every sport \u2014 consciously or not \u2014 made a foundational decision about how money flows to athletes. That decision shapes everything downstream: who holds leverage, who absorbs financial risk, and who accumulates lasting wealth. There are three models.",
      "THE CLUB PAYS YOU \u2014 A guaranteed salary in exchange for your movement, your image, and your leverage. Football. Basketball.",
      "THE TOUR PAYS YOU \u2014 Prize money based purely on results. No safety net, but no one owns your upside either. Tennis. Golf.",
      "THE PROMOTER PAYS YOU \u2014 Whoever controls access to the biggest stage controls the purse. Boxing. MMA.",
      "Most sports blend elements of all three. The interesting question is always which model dominates and who decided.",
      "These weren't neutral decisions. They were structures built by the people who already had power. The UFC generated $775 million in revenue in the first half of 2025 alone. Its fighters received 17% of it. The sport itself isn't the variable. The structure is.",
    ],
    bodySections: [
      {
        heading: "HOW WE GOT HERE",
        paragraphs: [
          "THE SHIFTING LEVERAGE \u2014 For most of sports history, the imbalance was large but hidden as deals were private. Athletes had no data, no advisors, no alternative. The Bosman ruling in 1995 began slowly shifting leverage. What changed everything was scale and transparency. Sport got richer, deals got public, and social media gave athletes a direct line to their own fanbase. For the first time, the leverage sat with the athlete.",
        ],
      },
    ],
    revShareTable: [
      { property: "US LEAGUES", pct: "", structure: "", notes: "", isHeader: true },
      { property: "NBA", pct: "~49–51%", structure: "CBA / BRI split", notes: "Decades of collective bargaining" },
      { property: "WNBA", pct: "~20–25%", structure: "CBA", notes: "New CBA signed 2025 , still significantly below NBA" },
      { property: "NFL", pct: "~48%", structure: "CBA / Hard split", notes: "Most disciplined cost control in sports" },
      { property: "MLS", pct: "~25–30%", structure: "Single-entity", notes: "Owners dominate heavily" },
      { property: "EUROPEAN FOOTBALL", pct: "", structure: "", notes: "", isHeader: true },
      { property: "Premier League", pct: "~60–70%", structure: "Market-driven", notes: "Players have massive leverage" },
      { property: "Bundesliga", pct: "~50–55%", structure: "Market-driven", notes: "Most financially disciplined" },
      { property: "INDIVIDUAL SPORTS", pct: "", structure: "", notes: "", isHeader: true },
      { property: "ATP Tour", pct: "~50%", structure: "Fragmented", notes: "Ongoing fight for more" },
      { property: "WTA Tour", pct: "~50–55%", structure: "Fragmented", notes: "Grand Slam disparity remains a tension point" },
      { property: "Grand Slams", pct: "~15–20%", structure: "Governing body", notes: "Biggest tension point in tennis" },
      { property: "PGA Tour", pct: "~35–40%", structure: "Tour-controlled", notes: "Rising under LIV pressure" },
      { property: "LIV Golf", pct: "~60–70%", structure: "Player-first", notes: "The benchmark that forced the reset" },
      { property: "PROMOTER-CONTROLLED", pct: "", structure: "", notes: "", isHeader: true },
      { property: "UFC", pct: "~18–22%", structure: "Promoter monopoly", notes: "Famously low" },
      { property: "Boxing (top level)", pct: "~60–80%", structure: "Star-driven", notes: "Stars take most of the pie" },
      { property: "GOVERNING BODIES", pct: "", structure: "", notes: "", isHeader: true },
      { property: "FIFA World Cup", pct: "~7–10%", structure: "Federation-controlled", notes: "Federations keep most" },
      { property: "Olympics", pct: "~0% direct", structure: "No revenue share", notes: "Athletes see none directly" },
    ],
    flipCards: [
      {
        id: "liv-golf",
        emoji: "",
        title: "LIV GOLF",
        subtitle: "When Capital Challenged a Century-Old Monopoly",
        frontSummary: "For 93 years, the PGA Tour held a structural monopoly over professional golf. No guaranteed income, no safety net, no alternative.",
        backParagraphs: [
          "In 2022, Saudi Arabia's PIF broke that open by offering guaranteed contracts. Phil Mickelson \u2014 six major titles, $74 million in career earnings \u2014 took a reported $200 million guaranteed. Within one season, total PGA Tour prize money increased by $153 million with every Tour member guaranteed a $500,000 earnings floor. A rival league dismissed as sportswashing permanently restructured how an entire sport compensates its athletes.",
        ],
        color: "#2D8B4E",
      },
      {
        id: "ufc-antitrust",
        emoji: "",
        title: "UFC ANTITRUST",
        subtitle: "When Fighters Finally Fought Back",
        frontSummary: "UFC fighters were not simply under-paid, averaging $7,500 per fight while their promoter signed billion-dollar television deals, they had no other option.",
        backParagraphs: [
          "The UFC systematically acquired every alternative promotion \u2014 Pride FC, WEC, Strikeforce. By 2011, there was one door, and Dana White held the key. In 2025, a ten-year antitrust lawsuit settled for $375 million. Fighters now know the structure is challengeable. That knowledge doesn't disappear.",
        ],
        color: BRAND.pink,
      },
      {
        id: "nil",
        emoji: "",
        title: "NIL",
        subtitle: "When the Last Unpaid Workforce Got Theirs",
        frontSummary: "The NCAA spent decades generating billions from athletes prohibited from earning a cent from their own name.",
        backParagraphs: [
          "A 2021 rule change broke that open. By 2024, top college athletes were earning seven figures before turning professional. They enter the system already knowing their commercial value belongs to them.",
        ],
        color: BRAND.navy,
      },
    ],
    athleteOwnership: [
      { year: "2009", athlete: "Serena Williams", team: "Miami Dolphins", sport: "NFL", type: "Minority" },
      { year: "2009", athlete: "Venus Williams", team: "Miami Dolphins", sport: "NFL", type: "Minority" },
      { year: "2010", athlete: "Michael Jordan", team: "Charlotte Hornets", sport: "NBA", type: "Majority" },
      { year: "2011", athlete: "LeBron James", team: "Liverpool FC (FSG)", sport: "Football", type: "Minority" },
      { year: "2012", athlete: "Magic Johnson", team: "LA Dodgers", sport: "MLB", type: "Minority" },
      { year: "2013", athlete: "Shaquille O'Neal", team: "Sacramento Kings", sport: "NBA", type: "Minority (sold)" },
      { year: "2014", athlete: "David Beckham", team: "Inter Miami CF", sport: "MLS", type: "Founding owner" },
      { year: "2014", athlete: "Magic Johnson", team: "LA Sparks", sport: "WNBA", type: "Minority" },
      { year: "2015", athlete: "Carmelo Anthony", team: "Puerto Rico FC", sport: "Football", type: "Founder/Owner" },
      { year: "2019", athlete: "James Harden", team: "Houston Dynamo", sport: "MLS", type: "Minority" },
      { year: "2019", athlete: "Russell Westbrook", team: "LAFC", sport: "MLS", type: "Minority" },
      { year: "2020", athlete: "Patrick Mahomes", team: "Kansas City Royals", sport: "MLB", type: "Minority" },
      { year: "2020", athlete: "Serena Williams", team: "Angel City FC", sport: "NWSL", type: "Minority" },
      { year: "2020", athlete: "Kevin Durant", team: "Philadelphia Union", sport: "MLS", type: "Minority" },
      { year: "2021", athlete: "Dwyane Wade", team: "Utah Jazz", sport: "NBA", type: "Minority" },
      { year: "2021", athlete: "Naomi Osaka", team: "NC Courage", sport: "NWSL", type: "Minority" },
      { year: "2021", athlete: "Patrick Mahomes", team: "Sporting KC", sport: "MLS", type: "Minority" },
      { year: "2021", athlete: "Alex Rodriguez", team: "Minnesota Timberwolves", sport: "NBA", type: "Majority (pending/partial)" },
      { year: "2022", athlete: "Kevin Durant", team: "NJ/NY Gotham FC", sport: "NWSL", type: "Minority" },
      { year: "2023", athlete: "Tom Brady", team: "Birmingham City FC", sport: "Football", type: "Minority" },
      { year: "2023", athlete: "JJ Watt", team: "Burnley FC", sport: "Football", type: "Minority" },
      { year: "2023", athlete: "Giannis Antetokounmpo", team: "Nashville SC", sport: "MLS", type: "Minority" },
      { year: "2023", athlete: "Dirk Nowitzki", team: "Dallas Mavericks", sport: "NBA", type: "Minority" },
      { year: "2023", athlete: "Trent Alexander-Arnold", team: "Alpine F1 Team", sport: "Motorsport", type: "Minority" },
      { year: "2023", athlete: "Rory McIlroy", team: "TGL Golf (Boston)", sport: "Golf", type: "Co-owner" },
      { year: "2023", athlete: "Tiger Woods", team: "TGL Golf (Jupiter)", sport: "Golf", type: "Co-owner" },
      { year: "2024", athlete: "Tom Brady", team: "Las Vegas Raiders", sport: "NFL", type: "Minority" },
    ],
    sections: [
      {
        heading: "WHERE DO WE GO FROM HERE",
        paragraphs: [
          "THE ATHLETE TAKES CONTROL \u2014 Athletes who accumulate capital stop being the asset on someone else's balance sheet and start being the person who owns it. In 2011, LeBron James invested $6.5 million for a small stake in Liverpool FC. By 2024, worth an estimated $100 million. The next generation of investors and franchise owners will include a significant number who built their capital base as athletes.",
          "THE ATHLETE IS THE IP \u2014 Leagues get valued as premium IP. But the actual draw, the audience, the cultural weight, sits with the athlete. It's Messi, not Inter Miami. So why not invest directly? Previous attempts to do that often failed because they securitised athletes instead of humanising them. The timing might be right for better structures. An alternative bet: back the platforms and structures closest to athlete IP.",
          "THE UNEVEN PICTURE \u2014 The shift is real but not uniform. The WNBA's landmark 2025 CBA is a significant step forward but the pay gap relative to the NBA remains one of the starkest illustrations of how structure, not talent, determines financial outcome. The baseline conditions still vary enormously by sport, by gender, and by geography.",
        ],
      },
    ],
    closingQuote: "The structure was never neutral. It was built by the people who already had power. Now, for the first time, athletes have enough capital, enough data, and enough alternatives to build something of their own.",
    color: BRAND.athletes,
  },
];
