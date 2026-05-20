import { createClient } from '@/lib/supabase/server'
import { SeatingManager } from '@/components/seating/seating-manager'
import { getSeatingData } from '@/services'
import { PageHeader } from '@/components/page-header'

export default async function SeatingPage() {
  const supabase = await createClient()
  const { guests, assignments, tables } = await getSeatingData(supabase)

  return (
    <div className="space-y-6">
      <PageHeader titleKey="seating.title" descriptionKey="seating.description" />
      <SeatingManager guests={guests} assignments={assignments} tables={tables} />
    </div>
  )
}
