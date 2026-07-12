import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Coffee Lab — Roast, Taste, Learn',
    short_name: 'Coffee Lab',
    description: '焙煎の経過、味の記憶、次の実験をつなぐコーヒーラボ。',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0908',
    theme_color: '#0B0908',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
