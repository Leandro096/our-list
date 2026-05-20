import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GuestDetail } from '@/components/guests/guest-detail'
import { getGuestById } from '@/services'

export default async function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const guest = await getGuestById(supabase, id)

  if (!guest) {
    notFound()
  }

  return <GuestDetail guest={guest} />
}
