import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { getGuestByIdWithFamily } from '@/services';

import { GuestDetail } from '@/components/guests/guest-detail';

export default async function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const guest = await getGuestByIdWithFamily(supabase, id);

  if (!guest) {
    notFound();
  }

  return <GuestDetail guest={guest} />;
}
