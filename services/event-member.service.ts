import type { SupabaseClient } from '@supabase/supabase-js';

import type { EventMember } from '@/lib/types';

// ---- Types ----

export interface EventMemberWithUser extends EventMember {
  tenant_members?: {
    id: string;
    user_id: string;
    users?: { display_name: string | null; email: string } | null;
    roles?: { name: string } | null;
  } | null;
}

// ---- Queries ----

/** All members assigned (granted visibility) to a given event. */
export async function getEventMembers(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventMemberWithUser[]> {
  const { data } = await supabase
    .from('event_members')
    .select('*, tenant_members(id, user_id, users(display_name, email), roles(name))')
    .eq('event_id', eventId)
    .order('created_at');

  return (data as unknown as EventMemberWithUser[]) ?? [];
}

// ---- Mutations ----

/** Grants a tenant member visibility to an event. Idempotent (unique constraint). */
export async function assignMemberToEvent(
  supabase: SupabaseClient,
  eventId: string,
  tenantMemberId: string,
  createdBy: string
): Promise<void> {
  const { error } = await supabase
    .from('event_members')
    .insert({ event_id: eventId, tenant_member_id: tenantMemberId, created_by: createdBy });

  if (error) throw error;
}

/** Revokes a member's event visibility by event_members row id. */
export async function removeEventMember(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('event_members').delete().eq('id', id);
  if (error) throw error;
}
