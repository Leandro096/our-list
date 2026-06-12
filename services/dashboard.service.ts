import type { SupabaseClient } from '@supabase/supabase-js';

import type { DashboardStats } from '@/lib/types';

export async function getDashboardStats(
  supabase: SupabaseClient,
  eventId?: string | null
): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_event_id: eventId ?? null,
  });

  if (error) throw error;

  return data as DashboardStats;
}
