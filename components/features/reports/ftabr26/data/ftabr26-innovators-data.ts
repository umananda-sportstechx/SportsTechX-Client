// @ts-nocheck
/* eslint-disable */
/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · Football Tech Innovators — PLACEHOLDERS

   TODO: replace with the 2026 innovator cohort before publication.

   Carried over from the Football Tech Report 2025 (source pp6, 26–30). Unlike
   GSTER26 — which pulls its cohort live from Notion via /api/report/innovators
   — this list is static until the 2026 research round is loaded into Notion.

   `photoUrl` on both rosters is generated — run `npm run sync:ftabr26-photos`
   to pull the headshots from the shared Drive folder into
   client/public/reports/ftabr26/ and rewrite these fields. Edit the manifest at
   scripts/ftabr26-photo-manifest.json, not these values. An empty string is a
   valid state: the report falls back to an initials avatar.
   ──────────────────────────────────────────────────────────────────────── */

export type FtabrInnovator = {
  id: string;
  name: string;
  company: string;
  designation: string;
  country: string;
  continent: "Europe" | "North America" | "South America" | "Asia-Pacific" | "Africa";
  linkedin: string;
  photoUrl: string;
  /** "Which emerging technologies will most impact football in the next 3–5 years?" */
  qTech: string;
  /** "Are there any underserved areas in football ripe for tech-driven disruption?" */
  qUnderserved: string;
};

export const FTABR26_QUESTIONS = {
  qTech: "Which emerging technologies do you believe will most impact the football industry in the next 3–5 years?",
  qUnderserved: "Are there any underserved areas in football that you think are ripe for tech-driven disruption?",
} as const;

export const FTABR26_INNOVATORS: FtabrInnovator[] = [
  {
    id: "albert-mundet",
    name: "Albert Mundet",
    company: "Barça Innovation Hub",
    designation: "General Manager",
    country: "Spain",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/albertmundet",
    photoUrl: "/reports/ftabr26/innovators/albert-mundet.webp",
    qTech: "Two main forces stand out: AI and long-tail digital marketing technologies. On one side, AI is transforming productivity across every business process, and football will be no exception. From player performance analytics to scouting, injury prevention, ticketing, fan engagement, and sponsorship activation, AI will streamline workflows and decision-making. That said, the game itself won't change: live sport has the unique ingredient of uncertainty that fuels passion and makes it irreplaceable. But around the pitch, AI will be embedded everywhere, reshaping how clubs, leagues, and sponsors operate. On the other side, I think the industry has a big gap when it comes to addressing long-tail digital audiences. Football has historically been built on mass sponsorships with a few big global brands, but this leaves a lot of opportunity on the table. Technology now enables micro-segmentation and scalable campaign execution, meaning rights holders can complement traditional big sponsors with a universe of smaller, long-tail partners, including local retailers, niche brands, or digital-native companies that want to target specific fan segments.",
    qUnderserved: "Yes, precisely this long-tail sponsorship and fan marketing space. While elite football is excellent at securing global sponsorships, it has not yet cracked the opportunity of scaling thousands of smaller, highly targeted commercial relationships through technology platforms. The tools exist, including programmatic advertising, AI-driven audience insights, and e-commerce integrations, but they are underutilized. Whoever manages to build the infrastructure to connect rights holders, small advertisers, and fans in a seamless way will create a new layer of value in the football economy.",
  },
  {
    id: "alejandro-ugarrio",
    name: "Alejandro Ugarrio",
    company: "Atleti Lab · Atlético de Madrid",
    designation: "Director of Atleti Lab and Deputy Director of Digital Development",
    country: "Spain",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/alejandrougarrio",
    photoUrl: "/reports/ftabr26/innovators/alejandro-ugarrio.webp",
    qTech: "The most disruptive applications will surely come from the combination of technologies. The sensorization of all aspects of the game, training and even the passion of the fans is a valuable basis on which to work. The challenge is to translate it into value by unlocking a deeper vision of the sport. And here AI emerges as a fundamental lever for data processing for tactical purposes, health prediction or improvement of experience.",
    qUnderserved: "From the clubs we strive to adopt comprehensive strategies that cover our entire area of action. Therefore, these are not underserved aspects. But there are areas such as sustainability, commitment to healthy lifestyle habits and sports values that are so important for society that they are always a priority. In this sense, the technologies that allow us to become aware of our impact on the environment, our state of health as a community (the proliferation of wearables is very important) are key.",
  },
  {
    id: "andy-selby",
    name: "Andy Selby",
    company: "Premier League",
    designation: "Senior Manager, Gaming",
    country: "United Kingdom",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/andrewliamselby",
    photoUrl: "/reports/ftabr26/innovators/andy-selby.webp",
    qTech: "I'm most interested in using gamification technology to engage fans globally, bringing them into our ecosystem, expanding their knowledge and deepening their connection to our teams and players. Gaming is a key means of data capture, and how fans are engaging with games and answering polls and quizzes is a great insight into their fandom.",
    qUnderserved: "Memberships and loyalty programmes are for the most part still very transactional in nature, focused around ticket and merchandise purchases and rewards. I think we'll see more mechanics taken from gaming over the coming years, tracking engagement, gaining XP, rewarding fandom in its entirety and not just spending.",
  },
  {
    id: "carolina-chiappero",
    name: "Carolina Chiappero",
    company: "Juventus Forward · Juventus FC",
    designation: "Innovation Manager",
    country: "Italy",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/carolina-chiappero-12551521",
    photoUrl: "/reports/ftabr26/innovators/carolina-chiappero.webp",
    qTech: "I don't think naming AI (from injury prevention to automatic dubbing), immersive tech, or Web3 is particularly groundbreaking. The real impact won't come from tools themselves, but from clubs willing to test, learn, and iterate. Innovation is ultimately about courage, vision, and culture, not only technology.",
    qUnderserved: "I don't believe there's a single “underserved area” ripe for disruption. It depends on context. In the U.S., performance tech is strategic; in Europe, fan engagement dominates (though the loyalty side still feels largely underserved). Part of the opportunity lies in adapting technologies from other industries, such as retail, media, health, and real estate, since football can learn from those sectors.",
  },
  {
    id: "charles-fremont",
    name: "Charles Frémont",
    company: "UEFA Innovation Hub",
    designation: "Senior Innovation Hub Manager",
    country: "Switzerland",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/charles-fr%C3%A9mont-17988139",
    photoUrl: "/reports/ftabr26/innovators/charles-fremont.webp",
    qTech: "Sustainability tech will have the greatest impact when adapted from proven solutions in other industries. While sports-specific innovations show promise, cross-sector technologies such as energy optimization and waste management tend to offer greater scalability and maturity, making them more viable for long-term collaboration.",
    qUnderserved: "Technology has untapped potential to strengthen football's role in building safer, more inclusive communities. Solutions that address discrimination, abuse, and accessibility can help clubs and federations foster environments where everyone feels welcome, protected, and empowered to participate. Useful tools include AI-powered moderation, anonymous reporting, and inclusive design.",
  },
  {
    id: "christopher-schlosser",
    name: "Christopher Schlosser",
    company: "Major League Soccer",
    designation: "Senior Vice President, Emerging Ventures",
    country: "USA",
    continent: "North America",
    linkedin: "https://linkedin.com/in/cschlosser",
    photoUrl: "/reports/ftabr26/innovators/christopher-schlosser.webp",
    qTech: "Fundamentally, we have a core belief that technology is an unlock that will continue to drive the future of the league, and we think MLS is at the very forefront globally for our use of technology. On the venture side, we think about technology in three areas. One, how do we make better players on the field? Two, how do we build better and more interesting fan engagement? And three, our global media partnership with Apple.",
    qUnderserved: "I think personalization, once you're in, is going to make that experience better. So you want to watch longer, you want to watch more. You want to watch a game that perhaps you wouldn't have otherwise watched. Maybe you stick around longer, you don't churn in a subscription fashion the way you might otherwise. I think that's where you're going to see that real benefit, versus just top-line growth. And on a digital platform, so you can create those really unique experiences that just wouldn't be possible if you had games on seven different broadcasters with different tech stacks and different systems.",
  },
  {
    id: "debora-saldanha",
    name: "Débora Saldanha",
    company: "Clube Atlético Mineiro SAF",
    designation: "Head of Innovation",
    country: "Brazil",
    continent: "South America",
    linkedin: "https://linkedin.com/in/deborasaldanha",
    photoUrl: "/reports/ftabr26/innovators/debora-saldanha.webp",
    qTech: "AI & computer vision, content automation (scale, multilingual); programmatic virtual advertising (global revenue); women's performance; smart stadiums / digital twins.",
    qUnderserved: "Women's health/performance data; lower-league media rights with automated production; accessibility and safety (inclusive stadiums, anti-harassment); interoperable fan identity/CRM across platforms; environmental operations (energy/waste); referee/coaching education via AI; match-fixing detection in emerging markets.",
  },
  {
    id: "giel-kirkels",
    name: "Giel Kirkels",
    company: "KNVB Football Innovation Hub #11",
    designation: "Captain of Insights & Innovation",
    country: "Netherlands",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/giel-kirkels-b2965217",
    photoUrl: "/reports/ftabr26/innovators/giel-kirkels.webp",
    qTech: "Consumer oriented cameras and sensors will provide endless opportunities to create video content and data to share around grassroots football matches.",
    qUnderserved: "Grassroots football. There is an enormous market for startups. Instead of focusing on the overcrowded professional sports market I would encourage companies to develop products and services for the grassroots football market. This provides enormous opportunities!",
  },
  {
    id: "hendrik-weber",
    name: "Hendrik Weber",
    company: "Deutsche Fußball Liga",
    designation: "SVP Sports-Technology-Innovation",
    country: "Germany",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/hendrik-weber-42aa",
    photoUrl: "/reports/ftabr26/innovators/hendrik-weber.webp",
    qTech: "Tremendous evolution of computer vision and derived skeletal data revolutionize sports by enabling precise, real-time analysis of athlete movements. They enhance performance tracking as well as the media product, create new rights assets, and support via officiating technology. By translating motion into structured data, coaches, analysts, fans and (agentic) AI systems gain deep insights that can transform training, game tactics, and fan engagement across both professional and amateur levels.",
    qUnderserved: "Grassroots and amateur football still lack access to advanced tools. Technology can close this gap through affordable wearables, mobile coaching apps, and AI-powered video analysis. These innovations democratize the usage of such sports technology and can lead to a genuine competitive edge regarding talent identification and development, making elite-level insights available to youth teams, academies or even small clubs, and underserved football communities worldwide.",
  },
  {
    id: "jan-alessie",
    name: "Jan Alessie",
    company: "World Football Summit",
    designation: "Co-founder and Managing Director",
    country: "Spain",
    continent: "Europe",
    linkedin: "https://linkedin.com/in/janalessie",
    photoUrl: "/reports/ftabr26/innovators/jan-alessie.webp",
    qTech: "As in every other aspect of our lives, Artificial Intelligence will be the technology that will have a more profound impact on football in the next 3–5 years. As we've heard from leaders across clubs, leagues, federations, brands and broadcasters at World Football Summit events, it's already reshaping the way the industry works, from scouting to operations and content production and distribution. Oscar Mayo, COO of Atlético de Madrid, explained how the club is using AI to streamline workflows across departments and deliver personalised content, an area where media companies such as OneFootball are also active. He also described how AI can support dynamic, context-aware pricing, common in aviation and hotels but rare in football, to maximize value without eroding experience.",
    qUnderserved: "I'm also very bullish on the impact of AI on women's football. Until very recently most performance models in the women's game were built on men's data, which limited their accuracy and relevance. Now we're seeing AI systems specifically trained on data from women athletes, allowing us to capture the unique physiological and tactical dimensions of the women's game. This not only improves scouting and injury prevention, but also accelerates the professionalization of leagues by surfacing talent. Combined with AI-driven audience metrics such as attendance, engagement, and global reach, this creates a compelling case for brands and investors to put real resources behind women's football.",
  },
  {
    id: "karla-hernandez",
    name: "Karla Hernández",
    company: "Mexican Football Federation",
    designation: "Gerente de Innovación, Estrategia Comercial",
    country: "Mexico",
    continent: "North America",
    linkedin: "https://www.linkedin.com/in/karla-h-valdez",
    photoUrl: "/reports/ftabr26/innovators/karla-hernandez.webp",
    qTech: "In the next five years, football will be transformed by technologies that go far beyond performance on the pitch. Advances in nutrition, hydration, mental health, stress evaluation, financial tools for elite athletes, and injury prevention will redefine athlete care. At the same time, talent detection (mainly for women's sports), new models to measure sponsorship ROI, and fan-centric solutions, from immersive live experiences to innovations designed for younger audiences, will shape the game's future commercially and socially.",
    qUnderserved: "Women's football continues to hold enormous potential for technological innovation and investment (technology related to the menstrual cycle, injury prevention, motherhood and sports, etc.). In addition, youth development-focused technologies, and mental health support remain underserved and represent high-impact opportunities.",
  },
  {
    id: "preeti-shetty",
    name: "Preeti Shetty",
    company: "Upshot · Brentford FC",
    designation: "CEO, Upshot · Director, Brentford FC",
    country: "United Kingdom",
    continent: "Europe",
    linkedin: "https://www.linkedin.com/in/preetisporty",
    photoUrl: "/reports/ftabr26/innovators/preeti-shetty.webp",
    qTech: "Fan identity & loyalty rails (wallets, interoperable IDs): portable memberships, micro-rewards, and secondary-market control; better data with consent by design. And women-specific health & performance tech: cycle-aware training, risk flags, return-to-play, pelvic-floor and ACL prevention.",
    qUnderserved: "Safeguarding & integrity: end-to-end case management (from report → investigation → learning) with privacy and auditability. Green operations: measurable Scope 3 cuts via fan travel routing, supplier scoring, and matchday waste automation.",
  },
  {
    id: "sebastian-koppers",
    name: "Sebastian Koppers",
    company: "DFB Akademie",
    designation: "Head of Performance & Insights",
    country: "Germany",
    continent: "Europe",
    linkedin: "https://www.linkedin.com/in/skoppers",
    photoUrl: "/reports/ftabr26/innovators/sebastian-koppers.webp",
    qTech: "(Emerging) technologies which support acute and strategic recovery of players, coaches and staff are most likely to have the biggest impact on the performance side of the football industry. The impact will be really big if AI-based individual recommendations get to a level that help on a professional level and support the work of experts, rather than taking them more time to correct/explain it.",
    qUnderserved: "Decision making in real football actions for players (on the pitch) and coaches (on the sideline) is still a big topic and if we are able to move from the rearview mirror/outside-in analysis to close-to-live performance feedback with continuous learning, then I'm really eager about the tech solutions to come.",
  },
  {
    id: "sudarshan-gopaladesikan",
    name: "Sudarshan Gopaladesikan",
    company: "Newcastle United FC",
    designation: "Technical Director",
    country: "United Kingdom",
    continent: "Europe",
    linkedin: "https://www.linkedin.com/in/sudarshan-gopaladesikan-24321a29",
    photoUrl: "/reports/ftabr26/innovators/sudarshan-gopaladesikan.webp",
    qTech: "Voice technology can unlock insights into player interactions on the pitch and coach-to-team communication. Research shows coaching blends impression management and technical instruction, with delivery often mattering most. Communication analytics, therefore, could become a powerful tool for understanding and improving performance.",
    qUnderserved: "Cognitive and psychological profiling has been discussed for years but remains underused in building mental resilience and concentration. Emerging technologies targeting those two topics across short, medium, and long-term dimensions are poised for disruption. Their application could redefine how athletes and teams develop the psychological edge needed for performance.",
  },
  {
    id: "tomasz-kowalczyk",
    name: "Tomasz Kowalczyk",
    company: "Polish Federation Innovation Hub",
    designation: "Head of PZPN Innovation Hub",
    country: "Poland",
    continent: "Europe",
    linkedin: "https://www.linkedin.com/in/tomaszmarcinkowalczyk",
    photoUrl: "/reports/ftabr26/innovators/tomasz-kowalczyk.webp",
    qTech: "Without a doubt, AI and Generative AI will have the most significant impact on football in the coming years. These technologies will not only enhance the quality and efficiency of training, but even more importantly, they will revolutionize the creation of modern, personalized content that meets the expectations of today's fans. Smart deployment of AI can help level the playing field, narrowing the gap between global giants and ambitious contenders by unlocking new ways to optimize performance, engagement and revenue.",
    qUnderserved: "One area that remains largely untapped is the use of advanced digital twins in football. Given the current pace of technological development, it's likely only a matter of time before digital twin technology becomes a core tool in training, performance management, and player care. Once fully developed, effective digital twins could also enable new phygital formats in which real-world events coexist and compete with virtual matches between digital counterparts of real teams. This would open the door to innovative fan experiences, hybrid competitions, and new commercial models for football.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Playmakers companies — startups run by members of the SportsTechX
   Playmakers community. These are the only companies Startups to Watch
   shows; descriptions, logos and links are joined from the startups feed.
   ──────────────────────────────────────────────────────────────────────── */

export type FtabrPlaymakerCompany = {
  id: string;
  company: string;
  country: string;
  /**
   * Company names as they appear in the startups feed
   * (/api/report/ftabr26/startups, fallback FTABR26_STARTUPS). Matched
   * case- and punctuation-insensitively, so "ReSpo.Vision" finds
   * "Respo Vision".
   */
  startupKeys: string[];
};

export const FTABR26_PLAYMAKER_COMPANIES: FtabrPlaymakerCompany[] = [
  { id: "oliver-sports",  company: "Oliver Sports",  country: "Spain",   startupKeys: ["OLIVER Sports"] },
  { id: "soccerment",     company: "Soccerment",     country: "Italy",   startupKeys: ["Soccerment"] },
  { id: "turfcoach",      company: "turfcoach",      country: "Germany", startupKeys: ["Turf Coach"] },
  { id: "coaches-voice",  company: "Coaches' Voice", country: "UK",      startupKeys: ["Coaches' Voice"] },
  { id: "marquee-ai",     company: "Marquee.AI",     country: "USA",     startupKeys: ["Marquee"] },
  { id: "playermaker",    company: "Playermaker",    country: "Israel",  startupKeys: ["Playermaker"] },
  { id: "gamecode-ai",    company: "GAMECODE.Ai",    country: "Germany", startupKeys: ["Gamecode.ai"] },
  { id: "prematch",       company: "Prematch",       country: "Germany", startupKeys: ["Prematch"] },
  { id: "celebreak",      company: "CeleBreak",      country: "Spain",   startupKeys: ["CeleBreak"] },
  { id: "playersnap",     company: "PlayerSnap",     country: "Chile",   startupKeys: ["PlayerSnap"] },
  { id: "fantasy-football-hub", company: "Fantasy Football Hub", country: "UK", startupKeys: ["Fantasy Football Hub"] },
  { id: "fanalysis",      company: "Fanalysis",      country: "UK",      startupKeys: ["Fanalysis"] },
];
