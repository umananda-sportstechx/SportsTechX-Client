import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Three font families per the ui_design system:
//  • Space Grotesk — display (headings, brand)
//  • Inter         — body
//  • JetBrains Mono — mono (KPIs, tickers, code, monospace small caps)
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/** The public origin. Atlas is the marketing front door for the app. */
export const SITE_URL = 'https://atlas.sportstechx.com';

const TITLE = 'Atlas — Your Insider Guide to Sports Tech & Venture';
const DESCRIPTION =
  'Market intelligence, investor tracking and warm introductions for founders raising in sports tech. Atlas is built by SportsTechX.';

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

/**
 * Inline boot script: reads the saved accent hue from localStorage and sets
 * `--accent-hue` on <html> *before* React paints. Without this the user would
 * see a brief flash of the default accent when navigating between pages until
 * `AppInit` runs in useEffect.
 *
 * next-themes already injects its own boot script for the theme attribute, so
 * we handle the accent hue and density here (Settings → Appearance writes both
 * to localStorage). Without this, navigations would flash the default until
 * `AppInit` runs in useEffect.
 */
const ACCENT_BOOT_SCRIPT = `
(function(){
  try {
    var hue = localStorage.getItem('stx:accent-hue');
    if (hue) document.documentElement.style.setProperty('--accent-hue', hue);
    var density = localStorage.getItem('stx:density');
    if (density === 'comfortable' || density === 'compact') document.documentElement.setAttribute('data-density', density);
  } catch (_) { /* ignore */ }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Default density. Tweaks panel can flip this at runtime. The theme
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
        <script dangerouslySetInnerHTML={{ __html: ACCENT_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
