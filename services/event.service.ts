import type { SupabaseClient } from '@supabase/supabase-js';

import type { WeddingEvent, EventSession } from '@/lib/types';

// ---- Queries ----

export async function getEventsForTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<WeddingEvent[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return (data as WeddingEvent[]) ?? [];
}

export async function getFirstEventForTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<WeddingEvent | null> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .single();

  return (data as WeddingEvent | null) ?? null;
}

export async function getEventById(
  supabase: SupabaseClient,
  eventId: string
): Promise<WeddingEvent | null> {
  const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
  return (data as WeddingEvent | null) ?? null;
}

export async function getEventSessions(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventSession[]> {
  const { data } = await supabase
    .from('event_sessions')
    .select('*')
    .or(`event_id.eq.${eventId},is_global.eq.true`)
    .order('sort_order');

  return (data as EventSession[]) ?? [];
}

// ---- Mutations ----

export async function createEvent(
  supabase: SupabaseClient,
  tenantId: string,
  payload: Pick<WeddingEvent, 'name' | 'event_date'>
): Promise<WeddingEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...payload, tenant_id: tenantId, status: 'active' })
    .select()
    .single();

  if (error) throw error;
  return data as WeddingEvent;
}

export async function updateEvent(
  supabase: SupabaseClient,
  eventId: string,
  payload: Partial<Pick<WeddingEvent, 'name' | 'event_date'>>
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) throw error;
}
