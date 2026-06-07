import { notFound } from 'next/navigation';

import { GuestConfirmation } from '@/components';

import { fetchGuestById } from './actions';

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guest = await fetchGuestById(id);

  if (!guest) {
    notFound();
  }

  return <GuestConfirmation guest={guest} />;
}
