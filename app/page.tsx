import type { Metadata } from 'next';

import { HomeClientPage } from './_home-client';

export const metadata: Metadata = {
  title: 'Wedding Guest List — Elegant Event Management',
  description:
    'Manage your wedding guest list with QR check-in, seating assignments, and real-time tracking.',
};

export default function Page() {
  return <HomeClientPage />;
}
