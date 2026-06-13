'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { PLATFORM_PERMISSIONS } from '@/lib/permissions';
import { ForbiddenError, UnauthorizedError, requirePlatformPermission } from '@/lib/server-auth';

import { assignPlatformRole, revokePlatformRole } from '@/services/platform.service';

const REVALIDATE = '/admin/roles';
export type RolesActionResult = { error?: string };

async function getCtx() {
  const supabase = await createClient();
  try {
    const ctx = await requirePlatformPermission(supabase, PLATFORM_PERMISSIONS.ROLES_MANAGE);
    return { supabase, ctx };
  } catch (err) {
    const error =
      err instanceof UnauthorizedError
        ? 'No autenticado.'
        : err instanceof ForbiddenError
          ? 'Sin permiso para gestionar roles de plataforma.'
          : 'Error de autorización.';
    return { error };
  }
}

export async function assignPlatformRoleAction(
  userId: string,
  roleId: string
): Promise<RolesActionResult> {
  const result = await getCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase, ctx } = result as Exclude<typeof result, { error: string }>;

  try {
    await assignPlatformRole(supabase, userId, roleId, ctx.userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al asignar el rol.' };
  }

  revalidatePath(REVALIDATE);
  return {};
}

export async function revokePlatformRoleAction(
  userId: string,
  roleId: string
): Promise<RolesActionResult> {
  const result = await getCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;

  try {
    await revokePlatformRole(supabase, userId, roleId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al revocar el rol.' };
  }

  revalidatePath(REVALIDATE);
  return {};
}
