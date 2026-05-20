import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardStats } from '@/lib/types'

export async function getDashboardStats(supabase: SupabaseClient): Promise<DashboardStats> {
  const [
    { data: guests },
    { data: categories },
    { data: recentActivity },
    { data: ceremonyScanLogs },
    { data: receptionScanLogs },
  ] = await Promise.all([
    supabase.from('guests').select('*, guest_categories(category_id, categories(*))'),
    supabase.from('categories').select('*'),
    supabase
      .from('scan_logs')
      .select('*, guests(first_name, last_name), users!scan_logs_scanned_by_fkey(display_name)')
      .order('scanned_at', { ascending: false })
      .limit(10),
    supabase
      .from('scan_logs')
      .select('guest_id')
      .eq('event_type', 'ceremony')
      .eq('is_duplicate', false),
    supabase
      .from('scan_logs')
      .select('guest_id')
      .eq('event_type', 'reception')
      .eq('is_duplicate', false),
  ])

  const guestList = guests ?? []
  const confirmedGuests = guestList.filter((g) => g.status === 'confirmed').length
  const pendingGuests = guestList.filter((g) => g.status === 'pending').length
  const declinedGuests = guestList.filter((g) => g.status === 'declined').length

  return {
    totalGuests: guestList.length,
    confirmedGuests,
    pendingGuests,
    declinedGuests,
    checkedInCeremony: new Set(ceremonyScanLogs?.map((s) => s.guest_id)).size,
    checkedInReception: new Set(receptionScanLogs?.map((s) => s.guest_id)).size,
    guestsByCategory: (categories ?? []).map((cat) => ({
      name: cat.name,
      color: cat.color,
      count: guestList.filter((g) =>
        g.guest_categories?.some(
          (gc: { category_id: string }) => gc.category_id === cat.id,
        ),
      ).length,
    })),
    guestsByStatus: [
      { status: 'Confirmed', count: confirmedGuests },
      { status: 'Pending', count: pendingGuests },
      { status: 'Declined', count: declinedGuests },
      { status: 'Tentative', count: guestList.filter((g) => g.status === 'tentative').length },
    ],
    recentActivity: recentActivity ?? [],
  }
}
