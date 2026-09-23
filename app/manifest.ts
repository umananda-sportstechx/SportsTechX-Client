import type { MetadataRoute } from 'next';
import { SITE_URL } from './layout';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Atlas by SportsTechX',
    short_name: 'Atlas',
    description:
      'Market intelligence, investor tracking and warm introductions for founders raising in sports tech.',
    id: SITE_URL,
    start_url: '/',
    display: 'standalone',
    background_color: '#060a17',
    theme_color: '#060a17',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
