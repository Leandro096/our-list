'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { ForbiddenError, UnauthorizedError, requireTenantPermission } from '@/lib/server-auth';

import type { StatusPayload } from '@/services/status.service';
import type { SessionPayload } from '@/services/session.service';
import { deleteStatus, updateStatus, createCustomStatus } from '@/services/status.service';
import { deleteSession, updateSession, createCustomSession } from '@/services/session.service';

const REVALIDATE = '/dashboard/settings/event';
export type EventSettingResult = { error?: string };

async function getCtx(permission: string) {
  const supabase = await createClient();
  try {
    const ctx = await requireTenantPermission(supabase, permission);
    return { supabase, ctx };
  } catch (err) {
    const error =
      err instanceof UnauthorizedError
        ? 'No autenticado.'
        : err instanceof ForbiddenError
          ? 'Sin permiso.'
          : 'Error de autorización.';
    return { error };
  }
}

// ---- Custom statuses ----

export async function createCustomStatusAction(
  payload: StatusPayload
): Promise<EventSettingResult> {
  const result = await getCtx(PERMISSIONS.STATUSES_MANAGE_CREATE);
  if ('error' in result && result.error) return { error: result.error };
  const { supabase, ctx } = result as Exclude<typeof result, { error: string }>;
  try {
    await createCustomStatus(supabase, ctx.tenantId, ctx.eventId, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al crear el estado.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}

export async function updateCustomStatusAction(
  statusId: string,
  payload: Partial<StatusPayload>
): Promise<EventSettingResult> {
  const result = await getCtx(PERMISSIONS.STATUSES_MANAGE_EDIT);
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;
  try {
    await updateStatus(supabase, statusId, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al actualizar el estado.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}

export async function deleteCustomStatusAction(statusId: string): Promise<EventSettingResult> {
  const result = await getCtx(PERMISSIONS.STATUSES_MANAGE_DELETE);
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;
  try {
    await deleteStatus(supabase, statusId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al eliminar el estado.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}

// ---- Custom sessions ----

export async function createCustomSessionAction(
  payload: SessionPayload
): Promise<EventSettingResult> {
  const result = await getCtx(PERMISSIONS.SESSIONS_MANAGE_CREATE);
  if ('error' in result && result.error) return { error: result.error };
  const { supabase, ctx } = result as Exclude<typeof result, { error: string }>;
  try {
    await createCustomSession(supabase, ctx.eventId, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al crear la sesión.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}

export async function updateCustomSessionAction(
  sessionId: string,
  payload: Partial<SessionPayload>
): Promise<EventSettingResult> {
  const result = await getCtx(PERMISSIONS.SESSIONS_MANAGE_EDIT);
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;
  try {
    await updateSession(supabase, sessionId, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al actualizar la sesión.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}

export async function deleteCustomSessionAction(sessionId: string): Promise<EventSettingResult> {
  const result = await getCtx(PERMISSIONS.SESSIONS_MANAGE_DELETE);
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;
  try {
    await deleteSession(supabase, sessionId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al eliminar la sesión.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}
