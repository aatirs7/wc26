import type { MetadataRoute } from 'next';

// Web app manifest so "Add to Home Screen" on Android (and installable
// PWA on desktop Chrome) uses the Siddiqui WC26 icon and launches the app
// standalone. iOS reads the apple-icon.png and the appleWebApp metadata
// in layout.tsx instead.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Siddiqui WC26 Bracket Pool',
    short_name: 'Siddiqui WC26',
    description: 'World Cup 2026 bracket pool for the Siddiqui family',
    start_url: '/',
    display: 'standalone',
    background_color: '#060a13',
    theme_color: '#060a13',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
