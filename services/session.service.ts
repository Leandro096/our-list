import type { SupabaseClient } from '@supabase/supabase-js';

import type { EventSession } from '@/lib/types';

// ---- Queries ----

export async function getGlobalSessions(supabase: SupabaseClient): Promise<EventSession[]> {
  const { data } = await supabase
    .from('event_sessions')
    .select('*')
    .is('event_id', null)
    .eq('is_global', true)
    .order('sort_order');

  return (data as EventSession[]) ?? [];
}

export async function getSessionsForEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventSession[]> {
  const { data } = await supabase
    .from('event_sessions')
    .select('*')
    .or(`is_global.eq.true,event_id.eq.${eventId}`)
    .order('sort_order');

  return (data as EventSession[]) ?? [];
}

// ---- Mutations ----

export type SessionPayload = {
  key: string;
  label: string;
  sort_order?: number;
};

export async function createGlobalSession(
  supabase: SupabaseClient,
  payload: SessionPayload
): Promise<EventSession> {
  const { data, error } = await supabase
    .from('event_sessions')
    .insert({ ...payload, is_global: true, sort_order: payload.sort_order ?? 99 })
    .select()
    .single();

  if (error) throw error;
  return data as EventSession;
}

export async function createCustomSession(
  supabase: SupabaseClient,
  eventId: string,
  payload: SessionPayload
): Promise<EventSession> {
  const { data, error } = await supabase
    .from('event_sessions')
    .insert({
      ...payload,
      event_id: eventId,
      is_global: false,
      sort_order: payload.sort_order ?? 99,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EventSession;
}

export async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  payload: Partial<SessionPayload>
): Promise<void> {
  const { error } = await supabase.from('event_sessions').update(payload).eq('id', sessionId);
  if (error) throw error;
}

export async function deleteSession(supabase: SupabaseClient, sessionId: string): Promise<void> {
  const { error } = await supabase.from('event_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}
