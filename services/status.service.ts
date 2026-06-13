import type { SupabaseClient } from '@supabase/supabase-js';

import type { GuestStatus } from '@/lib/types';

// ---- Queries ----

export async function getGlobalStatuses(supabase: SupabaseClient): Promise<GuestStatus[]> {
  const { data } = await supabase
    .from('statuses')
    .select('*')
    .is('tenant_id', null)
    .is('event_id', null)
    .eq('is_global', true)
    .order('sort_order');

  return (data as GuestStatus[]) ?? [];
}

export async function getStatusesForEvent(
  supabase: SupabaseClient,
  eventId: string,
  tenantId: string
): Promise<GuestStatus[]> {
  const { data } = await supabase
    .from('statuses')
    .select('*')
    .or(`is_global.eq.true,event_id.eq.${eventId},and(tenant_id.eq.${tenantId},event_id.is.null)`)
    .order('sort_order');

  return (data as GuestStatus[]) ?? [];
}

// ---- Mutations ----

export type StatusPayload = {
  key: string;
  label: string;
  color: string;
  sort_order?: number;
};

export async function createGlobalStatus(
  supabase: SupabaseClient,
  payload: StatusPayload
): Promise<GuestStatus> {
  const { data, error } = await supabase
    .from('statuses')
    .insert({ ...payload, is_global: true, sort_order: payload.sort_order ?? 99 })
    .select()
    .single();

  if (error) throw error;
  return data as GuestStatus;
}

export async function createCustomStatus(
  supabase: SupabaseClient,
  tenantId: string,
  eventId: string | null,
  payload: StatusPayload
): Promise<GuestStatus> {
  const { data, error } = await supabase
    .from('statuses')
    .insert({
      ...payload,
      tenant_id: tenantId,
      event_id: eventId,
      is_global: false,
      sort_order: payload.sort_order ?? 99,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GuestStatus;
}

export async function updateStatus(
  supabase: SupabaseClient,
  statusId: string,
  payload: Partial<StatusPayload>
): Promise<void> {
  const { error } = await supabase.from('statuses').update(payload).eq('id', statusId);
  if (error) throw error;
}

export async function deleteStatus(supabase: SupabaseClient, statusId: string): Promise<void> {
  const { error } = await supabase.from('statuses').delete().eq('id', statusId);
  if (error) throw error;
}
