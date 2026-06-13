import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Guests List App',
    short_name: 'GuestsList',
    description:
      'Elegant wedding guest management platform with QR check-in, seating assignments, and comprehensive guest tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF8',
    theme_color: '#1C1917',
    icons: [{ src: '/icon.png', sizes: 'any', type: 'image/png' }],
  };
}
