import type { SupabaseClient } from '@supabase/supabase-js'
import type { Guest, SeatingAssignment, Table } from '@/lib/types'

// ---- Return types ----

export type SeatingGuest = Pick<Guest, 'id' | 'first_name' | 'last_name' | 'status'> & {
  seating_assignments: Array<Pick<SeatingAssignment, 'id' | 'table_id'>>
}

export type SeatingAssignmentWithGuest = SeatingAssignment & {
  guests: Pick<Guest, 'id' | 'first_name' | 'last_name'>
  tables: Pick<Table, 'id' | 'name' | 'number'>
}

export type SeatingData = {
  guests: SeatingGuest[]
  assignments: SeatingAssignmentWithGuest[]
  tables: Table[]
}

// ---- Input types ----

export type AssignSeatInput = {
  guest_id: string
  table_id: string
}

export type CreateTableInput = {
  name: string
  number: string
  category?: string | null
  notes?: string | null
  capacity: number
  created_by?: string | null
}

export type UpdateTableInput = {
  name?: string
  number?: string
  category?: string | null
  notes?: string | null
  capacity?: number
}

// ---- Queries ----

export async function getSeatingData(supabase: SupabaseClient): Promise<SeatingData> {
  const [{ data: guests }, { data: assignments }, { data: tables }] = await Promise.all([
    supabase
      .from('guests')
      .select('id, first_name, last_name, status, seating_assignments(id, table_id)')
      .eq('status', 'confirmed')
      .order('last_name'),
    supabase
      .from('seating_assignments')
      .select('*, guests(id, first_name, last_name), tables(id, name, number)')
      .order('table_id'),
    supabase
      .from('tables')
      .select('*')
      .order('number'),
  ])

  return { guests: guests ?? [], assignments: assignments ?? [], tables: tables ?? [] }
}

// ---- Mutations ----

export async function createTable(
  supabase: SupabaseClient,
  input: CreateTableInput,
): Promise<Table> {
  const { data, error } = await supabase
    .from('tables')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTable(
  supabase: SupabaseClient,
  tableId: string,
): Promise<void> {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', tableId)

  if (error) throw error
}

export async function updateTable(
  supabase: SupabaseClient,
  tableId: string,
  input: UpdateTableInput,
): Promise<Table> {
  const { data, error } = await supabase
    .from('tables')
    .update(input)
    .eq('id', tableId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function assignSeat(
  supabase: SupabaseClient,
  input: AssignSeatInput,
): Promise<void> {
  const { error } = await supabase.from('seating_assignments').upsert(
    {
      guest_id: input.guest_id,
      table_id: input.table_id,
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

