import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GuestForm } from '@/components/guests/guest-form'
import { getGuestForEdit, getCategories } from '@/services'
import { PageHeader } from '@/components/page-header'

export default async function EditGuestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const [guest, categories] = await Promise.all([
    getGuestForEdit(supabase, id),
    getCategories(supabase),
  ])

  if (!guest) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader titleKey="guests.editGuest" descriptionKey="guests.editDescription" />
      <GuestForm categories={categories} guest={guest} mode="edit" />
    </div>
  )
}
