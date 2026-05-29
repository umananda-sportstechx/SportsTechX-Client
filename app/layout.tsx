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

export const metadata: Metadata = {
  title: {
    default: 'SportsTechX',
    template: '%s | SportsTechX',
  },
  description: 'The global platform for sports technology intelligence.',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <script dangerouslySetInnerHTML={{ __html: ACCENT_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
