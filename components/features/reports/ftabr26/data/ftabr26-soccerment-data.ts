// @ts-nocheck
/* eslint-disable */
/** Partner-supplied editorial copy, shared unchanged by web and PDF. */
const asset = (name: string) => `/reports/ftabr26/featured/soccerment-${name}.webp`;

export const FTABR26_SOCCERMENT = {
  name: "Soccerment",
  url: "https://soccerment.com/",
  eyebrow: "Partner feature · Soccerment",
  headline: "Building the Intelligence Layer of Football",
  logo: asset("logo"),
  founder: { name: "Aldo Comi", role: "CEO, Soccerment", photo: asset("aldo-comi-ceo") },
  problemLabel: "The problem & solution",
  about: [
    "Football clubs buy event data, video, GPS tracking and scouting software from different vendors, at prices only elite clubs afford, and analysts still turn it all into decisions by hand.",
    "Soccerment combines proprietary data, video and GPS wearables in one AI-native software suite, SICS+, where AI agents augment analysts’ work: more depth, less time, and a fraction of incumbents’ costs.",
  ],
  metrics: [
    { value: "95%", label: "Retention across 350+ contracts with clubs, agencies and federations in 50+ countries" },
  ],
  achievementsLabel: "Achievements",
  achievements: [
    "Integrated SICS in 2025; launched the ‘SICS Atlas’ scouting platform and ‘XSEED GPS’ in 2026.",
    "Selected for the MLS Innovation Lab and Juventus Forward innovation programmes.",
    "Backed by CDP Venture Capital and Azimut.",
  ],
  nextLabel: "The next 12–18 months",
  next:
    "We will take SICS Atlas into 10 key markets through our growing agent network, a €10M+ ARR opportunity, while integrating XSEED GPS and third-party wearable data into the platform to drive growth across our product lines. We also expect to close a Series A to accelerate commercial growth and deepen our data and product advantage.",
  images: {
    monitor: {
      src: asset("atlas-platform"),
      alt: "SICS Atlas scouting and match-analysis platform across laptop, tablet and mobile",
      caption: "01 / SICS Atlas · Scouting platform",
    },
    gallery: [
      {
        src: asset("xseed-gps"),
        alt: "XSEED GPS tracking kit beside a team performance dashboard",
        caption: "02 / XSEED GPS · Wearable tracking",
      },
      {
        src: asset("staff-sics-atlas"),
        alt: "Football performance staff reviewing SICS Atlas data in a video-analysis room",
        caption: "03 / SICS Atlas · Team analysis",
      },
    ],
  },
} as const;
