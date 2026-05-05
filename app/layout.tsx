import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Open_Sans, DM_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  variable: '--font-bebas',
  subsets: ['latin'],
  display: 'swap',
});

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
  display: 'swap',
});

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono',
  subsets: ['latin'],
  display: 'swap',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bebasNeue.variable} ${openSans.variable} ${dmMono.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
