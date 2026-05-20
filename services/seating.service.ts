import type { SupabaseClient } from '@supabase/supabase-js'
import type { Guest, SeatingAssignment } from '@/lib/types'

// ---- Return types ----

export type SeatingGuest = Pick<Guest, 'id' | 'first_name' | 'last_name' | 'status'> & {
  seating_assignments: Array<Pick<SeatingAssignment, 'id' | 'table_number' | 'seat_number'>>
}

export type SeatingAssignmentWithGuest = SeatingAssignment & {
  guests: Pick<Guest, 'id' | 'first_name' | 'last_name'>
}

export type SeatingData = {
  guests: SeatingGuest[]
  assignments: SeatingAssignmentWithGuest[]
  tables: string[]
}

// ---- Input types ----

export type AssignSeatInput = Pick<SeatingAssignment, 'guest_id' | 'table_number'> & {
  seat_number?: number | null
}

// ---- Queries ----

export async function getSeatingData(supabase: SupabaseClient): Promise<SeatingData> {
  const [{ data: guests }, { data: assignments }] = await Promise.all([
    supabase
      .from('guests')
      .select('id, first_name, last_name, status, seating_assignments(*)')
      .eq('status', 'confirmed')
      .order('last_name'),
    supabase
      .from('seating_assignments')
      .select('*, guests(id, first_name, last_name)')
      .order('table_number'),
  ])

  const tables = [...new Set((assignments ?? []).map((a) => a.table_number))]

  return { guests: guests ?? [], assignments: assignments ?? [], tables }
}

// ---- Mutations ----

export async function assignSeat(
  supabase: SupabaseClient,
  input: AssignSeatInput,
): Promise<void> {
  const { error } = await supabase.from('seating_assignments').upsert(
    {
      guest_id: input.guest_id,
      table_number: input.table_number,
      seat_number: input.seat_number ?? null,
    },
    { onConflict: 'guest_id' },
  )

  if (error) throw error
}

export async function removeSeatAssignment(
  supabase: SupabaseClient,
  guestId: string,
): Promise<void> {
  const { error } = await supabase
    .from('seating_assignments')
    .delete()
    .eq('guest_id', guestId)

  if (error) throw error
}
