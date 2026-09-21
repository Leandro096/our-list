'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { ensureTenantEvent } from '@/lib/provision-tenant';
import { writeActiveEvent, writeActiveTenant } from '@/lib/active-context';

export type ContextActionResult = { error?: string };

/**
 * Switches the active tenant. Validates that the caller is an active member of
 * the target tenant before persisting. Clears the active event so it
 * re-resolves for the new tenant.
 */
export async function setActiveTenantAction(tenantId: string): Promise<ContextActionResult> {
  if (!tenantId) return { error: 'Tenant requerido.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) return { error: 'No perteneces a este workspace.' };

  await writeActiveTenant(tenantId);
  revalidatePath('/dashboard', 'layout');
  return {};
}

/**
 * Switches the active event. Validates visibility via RLS (the SELECT only
 * returns the row when the user may see the event) before persisting.
 */
export async function setActiveEventAction(eventId: string): Promise<ContextActionResult> {
  if (!eventId) return { error: 'Evento requerido.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('status', 'active')
    .maybeSingle();

  if (!event) return { error: 'No tienes acceso a este evento.' };

  await writeActiveEvent(eventId);
  revalidatePath('/dashboard', 'layout');
  return {};
}

/**
 * Creates a default event for the caller's active tenant when none exists
 * yet — surfaced as a "create your first event" CTA on the dashboard instead
 * of letting getActiveContext's ForbiddenError reach the error boundary.
 * Uses the admin client internally (ensureTenantEvent), so it works even if
 * the caller's RLS visibility on `events` is degraded.
 */
export async function createFirstEventAction(): Promise<ContextActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .maybeSingle();

  const tenantId = (membership as { tenant_id: string } | null)?.tenant_id ?? null;
  if (!tenantId) return { error: 'No tienes un workspace activo.' };

  try {
    await ensureTenantEvent(tenantId, user.id);
  } catch {
    return { error: 'No se pudo crear el evento. Intenta de nuevo.' };
  }

  revalidatePath('/dashboard', 'layout');
  return {};
}
