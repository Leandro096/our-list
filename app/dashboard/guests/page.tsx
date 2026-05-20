import { createClient } from '@/lib/supabase/server'
import { GuestList } from '@/components/guests/guest-list'
import { getGuests, getCategories } from '@/services'
import { PageHeader } from '@/components/page-header'

export default async function GuestsPage() {
  const supabase = await createClient()
  const [guests, categories] = await Promise.all([
    getGuests(supabase),
    getCategories(supabase),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        titleKey="guests.title"
        descriptionKey="guests.description"
        actionKey="guests.addGuest"
        actionHref="/dashboard/guests/new"
      />
      <GuestList guests={guests} categories={categories} />
    </div>
  )
}
