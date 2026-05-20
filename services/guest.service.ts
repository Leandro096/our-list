import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, EventAttendance, Guest, ScanLog, SeatingAssignment, User } from '@/lib/types'

// ---- Return types ----

export type GuestListItem = Guest & {
  guest_categories: Array<{
    category_id: string
    categories: Pick<Category, 'id' | 'name' | 'color'>
  }>
  event_attendance: EventAttendance[]
  seating_assignments: SeatingAssignment[]
}

export type GuestDetail = Guest & {
  guest_categories: Array<{
    category_id: string
    categories: Pick<Category, 'id' | 'name' | 'color'>
  }>
  event_attendance: EventAttendance[]
  seating_assignments: SeatingAssignment[]
  scan_logs: Array<ScanLog & { users: Pick<User, 'display_name'> | null }>
}

export type GuestForEdit = Guest & {
  guest_categories: Array<{ category_id: string }>
}

// ---- Input types ----

export type CreateGuestInput = Pick<
  Guest,
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'status'
  | 'dietary_restrictions'
  | 'notes'
  | 'is_plus_one'
> & {
  selectedCategories: string[]
  ceremony_attending: boolean
  reception_attending: boolean
}

export type UpdateGuestInput = Partial<
  Pick<
    Guest,
    | 'first_name'
    | 'last_name'
    | 'email'
    | 'phone'
    | 'status'
    | 'dietary_restrictions'
    | 'notes'
    | 'is_plus_one'
  >
> & {
  selectedCategories?: string[]
}

// ---- Queries ----

export async function getGuests(supabase: SupabaseClient): Promise<GuestListItem[]> {
  const { data } = await supabase
    .from('guests')
    .select(`
      *,
      guest_categories(
        category_id,
        categories(id, name, color)
      ),
      event_attendance(*),
      seating_assignments(*)
    `)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getGuestById(
  supabase: SupabaseClient,
  id: string,
): Promise<GuestDetail | null> {
  const { data } = await supabase
    .from('guests')
    .select(`
      *,
      guest_categories(
        category_id,
        categories(id, name, color)
      ),
      event_attendance(*),
      seating_assignments(*),
      scan_logs(*, users!scan_logs_scanned_by_fkey(display_name))
    `)
    .eq('id', id)
    .single()

  return data ?? null
}

export async function getGuestForEdit(
  supabase: SupabaseClient,
  id: string,
): Promise<GuestForEdit | null> {
  const { data } = await supabase
    .from('guests')
    .select(`
      *,
      guest_categories(category_id)
    `)
    .eq('id', id)
    .single()

  return data ?? null
}

// ---- Mutations ----

export async function createGuest(
  supabase: SupabaseClient,
  input: CreateGuestInput,
): Promise<Guest> {
  const { selectedCategories, ceremony_attending, reception_attending, ...guestFields } = input

  console.log('[createGuest] calling RPC create_guest_full with:', guestFields)

  // DEBUG TEMPORAL: insert directo para verificar si el cliente llega a la red
  const { data: debugData, error: debugError } = await supabase
    .from('guests')
    .insert({
      first_name: guestFields.first_name,
      last_name: guestFields.last_name,
      status: guestFields.status,
    })
    .select()
    .single()
  console.log('[createGuest] DEBUG insert → data:', debugData, '| error:', debugError)
  if (debugData) return debugData as Guest
  if (debugError) throw debugError

  const rpcPromise = supabase.rpc('create_guest_full', {
    p_first_name:           guestFields.first_name,
    p_last_name:            guestFields.last_name,
    p_email:                guestFields.email ?? '',
    p_phone:                guestFields.phone ?? '',
    p_status:               guestFields.status,
    p_dietary_restrictions: guestFields.dietary_restrictions ?? '',
    p_notes:                guestFields.notes ?? '',
    p_is_plus_one:          guestFields.is_plus_one,
    p_category_ids:         selectedCategories,
    p_ceremony_attending:   ceremony_attending,
    p_reception_attending:  reception_attending,
  })
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('[createGuest] TIMEOUT: RPC did not respond in 8s')), 8000)
  )

  const { data, error } = await Promise.race([rpcPromise, timeoutPromise])
  console.log('[createGuest] RPC response → data:', data, '| error:', error)

  if (error) throw error

  return data as Guest
}

export async function updateGuest(
  supabase: SupabaseClient,
  id: string,
  input: UpdateGuestInput,
): Promise<void> {
  const { selectedCategories, ...fields } = input

  const { error } = await supabase.rpc('update_guest_with_categories', {
    p_guest_id:     id,
    p_fields:       fields,
    p_category_ids: selectedCategories ?? null,
  })

  if (error) throw error
}
