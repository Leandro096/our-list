import type { SupabaseClient } from '@supabase/supabase-js';

import type { User, Guest, ScanLog } from '@/lib/types';

// ---- Return types ----

export type TodayStats = { ceremony: number; reception: number };

export type ScannerGuest = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  categories: Array<{ name: string; color: string }>;
  seating: { table_number: string; seat_number: number | null } | undefined;
};

export type ProcessScanResult =
  | { found: false }
  | {
      found: true;
      guest: ScannerGuest;
      is_duplicate: boolean;
      today_stats: TodayStats;
    };

export type ScanHistoryItem = ScanLog & {
  guests: Pick<Guest, 'first_name' | 'last_name' | 'invitation_guid'>;
  users: Pick<User, 'display_name' | 'email'> | null;
};

// ---- Queries ----

export async function getTodayStats(supabase: SupabaseClient): Promise<TodayStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

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
  ]);

  return {
    ceremony: new Set(ceremony?.map((s) => s.guest_id)).size,
    reception: new Set(reception?.map((s) => s.guest_id)).size,
  };
}

export async function getScanHistory(
  supabase: SupabaseClient,
  limit = 100
): Promise<ScanHistoryItem[]> {
  const { data } = await supabase
    .from('scan_logs')
    .select(
      `
      *,
      guests(first_name, last_name, invitation_guid),
      users!scan_logs_scanned_by_fkey(display_name, email)
    `
    )
    .order('scanned_at', { ascending: false })
    .limit(limit);

  return data ?? [];
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
  scannedBy: string | undefined
): Promise<ProcessScanResult> {
  const { data, error } = await supabase.rpc('process_guest_scan', {
    p_invitation_guid: invitationGuid,
    p_event_type: eventType,
    p_scanned_by: scannedBy ?? null,
  });

  if (error) throw error;

  const result = data as {
    found: boolean;
    guest?: ScannerGuest;
    is_duplicate?: boolean;
    today_stats?: TodayStats;
  };

  if (!result.found) return { found: false };

  return {
    found: true,
    guest: result.guest!,
    is_duplicate: result.is_duplicate!,
    today_stats: result.today_stats!,
  };
}

// ---- Family scan types ----

export type GroupScanMember = {
  id: string;
  first_name: string;
  last_name: string;
  is_duplicate: boolean;
};

export type ProcessGroupScanResult =
  | { found: false }
  | {
      found: true;
      group_root: ScannerGuest;
      members: GroupScanMember[];
      any_duplicate: boolean;
      all_duplicate: boolean;
      today_stats: TodayStats;
    };

// ---- Family scan mutation ----

export async function processGuestScanByFamily(
  supabase: SupabaseClient,
  invitationGuid: string,
  eventType: 'ceremony' | 'reception',
  scannedBy: string | undefined
): Promise<ProcessGroupScanResult> {
  // Find guest by guid
  const { data: guestRow } = await supabase
    .from('guests')
    .select('id, parent_guest_id')
    .eq('invitation_guid', invitationGuid)
    .limit(1);

  if (!guestRow || guestRow.length === 0) return { found: false };

  const scannedGuest = guestRow[0] as { id: string; parent_guest_id: string | null };
  const rootId = scannedGuest.parent_guest_id ?? scannedGuest.id;

  // Get all family members (root + children)
  const { data: children } = await supabase
    .from('guests')
    .select('id, first_name, last_name')
    .eq('parent_guest_id', rootId);

  // Get root guest full data for scanner display
  const { data: rootData } = await supabase
    .from('guests')
    .select(
      `
      id, first_name, last_name, status,
      guest_categories(categories(name, color)),
      seating_assignments(tables(number))
    `
    )
    .eq('id', rootId)
    .single();

  if (!rootData) return { found: false };

  const rootGuest: ScannerGuest = {
    id: (rootData as { id: string }).id,
    first_name: (rootData as { first_name: string }).first_name,
    last_name: (rootData as { last_name: string }).last_name,
    status: (rootData as { status: string }).status,
    categories: (
      (
        rootData as unknown as {
          guest_categories: Array<{ categories: { name: string; color: string } }>;
        }
      ).guest_categories ?? []
    ).map((gc) => ({ name: gc.categories.name, color: gc.categories.color })),
    seating: (() => {
      const sa = (
        rootData as unknown as { seating_assignments: Array<{ tables: { number: string } | null }> }
      ).seating_assignments?.[0];
      if (!sa?.tables) return undefined;
      return { table_number: sa.tables.number, seat_number: null };
    })(),
  };

  const allMemberIds: Array<{ id: string; first_name: string; last_name: string }> = [
    { id: rootId, first_name: rootGuest.first_name, last_name: rootGuest.last_name },
    ...((children ?? []) as Array<{ id: string; first_name: string; last_name: string }>),
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const memberResults: GroupScanMember[] = [];

  for (const member of allMemberIds) {
    const { data: existingScans } = await supabase
      .from('scan_logs')
      .select('id')
      .eq('guest_id', member.id)
      .eq('event_type', eventType)
      .eq('is_duplicate', false)
      .gte('scanned_at', todayIso)
      .limit(1);

    const isDuplicate = (existingScans?.length ?? 0) > 0;

    await supabase.from('scan_logs').insert({
      guest_id: member.id,
      event_type: eventType,
      scanned_by: scannedBy ?? null,
      is_duplicate: isDuplicate,
      scanned_at: new Date().toISOString(),
    });

    memberResults.push({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      is_duplicate: isDuplicate,
    });
  }

  // Recalculate today stats
  const [{ data: ceremonyScans }, { data: receptionScans }] = await Promise.all([
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
  ]);

  const todayStats: TodayStats = {
    ceremony: new Set(ceremonyScans?.map((s) => s.guest_id)).size,
    reception: new Set(receptionScans?.map((s) => s.guest_id)).size,
  };

  return {
    found: true,
    group_root: rootGuest,
    members: memberResults,
    any_duplicate: memberResults.some((m) => m.is_duplicate),
    all_duplicate: memberResults.every((m) => m.is_duplicate),
    today_stats: todayStats,
  };
}
