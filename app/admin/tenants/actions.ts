'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { PLATFORM_PERMISSIONS } from '@/lib/permissions';
import { ForbiddenError, UnauthorizedError, requirePlatformPermission } from '@/lib/server-auth';

import { suspendTenant, changeTenantPlan, reactivateTenant } from '@/services/platform.service';

const REVALIDATE = '/admin/tenants';

export type TenantActionResult = { error?: string };

async function getManageCtx() {
  const supabase = await createClient();
  try {
    const ctx = await requirePlatformPermission(supabase, PLATFORM_PERMISSIONS.TENANTS_MANAGE);
    return { supabase, ctx };
  } catch (err) {
    const error =
      err instanceof UnauthorizedError
        ? 'No autenticado.'
        : err instanceof ForbiddenError
          ? 'Sin permiso para gestionar tenants.'
          : 'Error de autorización.';
    return { error };
  }
}

export async function suspendTenantAction(tenantId: string): Promise<TenantActionResult> {
  const result = await getManageCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;

  try {
    await suspendTenant(supabase, tenantId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo suspender el tenant.' };
  }

  revalidatePath(REVALIDATE);
  return {};
}

export async function reactivateTenantAction(tenantId: string): Promise<TenantActionResult> {
  const result = await getManageCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;

  try {
    await reactivateTenant(supabase, tenantId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo reactivar el tenant.' };
  }

  revalidatePath(REVALIDATE);
  return {};
}

export async function changeTenantPlanAction(
  tenantId: string,
  planId: string,
  billingType: 'one_time' | 'recurring'
): Promise<TenantActionResult> {
  const result = await getManageCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;

  try {
    await changeTenantPlan(supabase, tenantId, planId, billingType);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo cambiar el plan.' };
  }

  revalidatePath(REVALIDATE);
  return {};
}
