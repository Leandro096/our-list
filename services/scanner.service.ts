import type { SupabaseClient } from '@supabase/supabase-js'
import type { Guest, ScanLog, User } from '@/lib/types'

// ---- Return types ----

export type TodayStats = { ceremony: number; reception: number }

export type ScannerGuest = {
  id: string
  first_name: string
  last_name: string
  status: string
  categories: Array<{ name: string; color: string }>
  seating: { table_number: string; seat_number: number | null } | undefined
}

export type ProcessScanResult =
  | { found: false }
  | {
      found: true
      guest: ScannerGuest
      is_duplicate: boolean
      today_stats: TodayStats
    }

export type ScanHistoryItem = ScanLog & {
  guests: Pick<Guest, 'first_name' | 'last_name' | 'invitation_guid'>
  users: Pick<User, 'display_name' | 'email'> | null
}

// ---- Queries ----

export async function getTodayStats(supabase: SupabaseClient): Promise<TodayStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  const [{ data: ceremony }, { data: reception }] = await Promise.all([
    supabase
      .from('scan_logs')
      .select('guest_id')
      .eq('event_type', 'ceremony')
      .eq('is_duplicate', false)
      .gte('scanned_at', todayIso),
    supabase
      .from('scan_logs')
      .select('guest_id')
      .eq('event_type', 'reception')
      .eq('is_duplicate', false)
      .gte('scanned_at', todayIso),
  ])

  return {
    ceremony: new Set(ceremony?.map((s) => s.guest_id)).size,
    reception: new Set(reception?.map((s) => s.guest_id)).size,
  }
}

export async function getScanHistory(
  supabase: SupabaseClient,
  limit = 100,
): Promise<ScanHistoryItem[]> {
  const { data } = await supabase
    .from('scan_logs')
    .select(`
      *,
      guests(first_name, last_name, invitation_guid),
      users!scan_logs_scanned_by_fkey(display_name, email)
    `)
    .order('scanned_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

// ---- Mutations ----

/**
 * Looks up the guest, checks for duplicate scan, logs the scan,
 * and returns guest data + updated today stats — all in one round-trip.
 */
export async function processGuestScan(
  supabase: SupabaseClient,
  invitationGuid: string,
  eventType: 'ceremony' | 'reception',
  scannedBy: string | undefined,
): Promise<ProcessScanResult> {
  const { data, error } = await supabase.rpc('process_guest_scan', {
    p_invitation_guid: invitationGuid,
    p_event_type:      eventType,
    p_scanned_by:      scannedBy ?? null,
  })

  if (error) throw error

  const result = data as {
    found: boolean
    guest?: ScannerGuest
    is_duplicate?: boolean
    today_stats?: TodayStats
  }

  if (!result.found) return { found: false }

  return {
    found:        true,
    guest:        result.guest!,
    is_duplicate: result.is_duplicate!,
    today_stats:  result.today_stats!,
  }
}
