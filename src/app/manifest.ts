import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Coffee Lab — Roast OS',
    short_name: 'Coffee Lab',
    description: '焙煎、テイスティング、次の実験をつなぐコーヒーラボ。',
    start_url: '/',
    display: 'standalone',
    background_color: '#090B0D',
    theme_color: '#090B0D',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
