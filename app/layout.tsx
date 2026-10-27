import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import './globals.css';

// Three font families per the ui_design system:
//  • Space Grotesk — display (headings, brand)
//  • Inter         — body
//  • JetBrains Mono — mono (KPIs, tickers, code, monospace small caps)
//
// Self-hosted (next/font/local), NOT next/font/google: the Google loader fetches
// the font files from fonts.gstatic.com AT BUILD TIME, and when that fetch flakes
// on a cold Vercel build the whole deploy fails with a font module-not-found.
// The latin woff2s live in ./fonts and ship with the repo, so builds never touch
// the network. Weights are variable ranges. Re-download: Google Fonts CSS2 API,
// latin subset (see scripts or app/fonts/README if refreshing).
const spaceGrotesk = localFont({
  src: './fonts/space-grotesk.woff2',
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: '300 700',
});

const inter = localFont({
  src: './fonts/inter.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono.woff2',
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: '100 800',
});

/** The public origin. Atlas is the marketing front door for the app. */
export const SITE_URL = 'https://atlas.sportstechx.com';

const TITLE = 'Atlas | Sports Tech Intelligence by SportsTechX';
const DESCRIPTION =
  'Explore sports tech companies and investors, prepare your next funding round and source investment opportunities with Atlas by SportsTechX.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | Atlas' },
  description: DESCRIPTION,
  applicationName: 'Atlas',
  keywords: [
    'sports tech', 'sportstech investors', 'sports tech fundraising',
    'sports tech venture capital', 'investor database', 'Atlas', 'SportsTechX',
  ],
  authors: [{ name: 'SportsTechX', url: 'https://sportstechx.com' }],
  creator: 'SportsTechX',
  publisher: 'SportsTechX GmbH',
  category: 'technology',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Atlas by SportsTechX',
    locale: 'en_US',
    url: '/',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  formatDetection: { telephone: false },
  /* No `icons` key on purpose. It used to name /stx_pink.png first, which is
     the STX lockup - wrong brand for Atlas, and it carries a wordmark that is
     unreadable at 16px. An explicit key also OVERRIDES the app/icon.png and
     app/favicon.ico file conventions, so the Atlas mark never shipped. */
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#060a17' },
  ],
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Fixed density. The theme
      // attribute (data-theme) is now managed entirely by next-themes via
      // providers.tsx — no hardcoded default here, otherwise it sticks.
      // `compact` matches the ui_design_3 shipped default.
      data-density="compact"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        {/* Adobe Fonts kit from the designer's account (same kit the landing/
            project uses). Serves `new-frank`; Kepler Std must be added to this
            kit before the landing page's serif renders as designed. The licence
            travels with the kit, so no binaries live in this repo. NOTE: Adobe
            kits are domain-allowlisted — atlas.sportstechx.com has to be on the
            kit's list or this silently serves nothing in production. */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="" />
        <link rel="stylesheet" href="https://use.typekit.net/jyx6vei.css" />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
