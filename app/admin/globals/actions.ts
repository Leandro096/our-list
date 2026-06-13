'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { PLATFORM_PERMISSIONS } from '@/lib/permissions';
import { ForbiddenError, UnauthorizedError, requirePlatformPermission } from '@/lib/server-auth';

import type { StatusPayload, SessionPayload } from '@/services/session.service';
import { deleteStatus, updateStatus, createGlobalStatus } from '@/services/status.service';
import { deleteSession, updateSession, createGlobalSession } from '@/services/session.service';

const REVALIDATE = '/admin/globals';
export type GlobalActionResult = { error?: string };

async function getCtx() {
  const supabase = await createClient();
  try {
    await requirePlatformPermission(supabase, PLATFORM_PERMISSIONS.GLOBALS_MANAGE);
    return { supabase };
  } catch (err) {
    const error =
      err instanceof UnauthorizedError
        ? 'No autenticado.'
        : err instanceof ForbiddenError
          ? 'Sin permiso para gestionar globales.'
          : 'Error de autorización.';
    return { error };
  }
}

// ---- Statuses ----

export async function createGlobalStatusAction(
  payload: StatusPayload
): Promise<GlobalActionResult> {
  const result = await getCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;
  try {
    await createGlobalStatus(supabase, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al crear el estado.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}

export async function updateStatusAction(
  statusId: string,
  payload: Partial<StatusPayload>
): Promise<GlobalActionResult> {
  const result = await getCtx();
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

export async function deleteStatusAction(statusId: string): Promise<GlobalActionResult> {
  const result = await getCtx();
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

// ---- Sessions ----

export async function createGlobalSessionAction(
  payload: SessionPayload
): Promise<GlobalActionResult> {
  const result = await getCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;
  try {
    await createGlobalSession(supabase, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al crear la sesión.' };
  }
  revalidatePath(REVALIDATE);
  return {};
}

export async function updateSessionAction(
  sessionId: string,
  payload: Partial<SessionPayload>
): Promise<GlobalActionResult> {
  const result = await getCtx();
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

export async function deleteSessionAction(sessionId: string): Promise<GlobalActionResult> {
  const result = await getCtx();
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
