'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { PLATFORM_PERMISSIONS } from '@/lib/permissions';
import { ForbiddenError, UnauthorizedError, requirePlatformPermission } from '@/lib/server-auth';

import { togglePlanActive, updatePlanStripePriceId } from '@/services/platform.service';

const REVALIDATE = '/admin/plans';

export type PlanActionResult = { error?: string };

async function getManageCtx() {
  const supabase = await createClient();
  try {
    await requirePlatformPermission(supabase, PLATFORM_PERMISSIONS.PLANS_MANAGE);
    return { supabase };
  } catch (err) {
    const error =
      err instanceof UnauthorizedError
        ? 'No autenticado.'
        : err instanceof ForbiddenError
          ? 'Sin permiso para gestionar planes.'
          : 'Error de autorización.';
    return { error };
  }
}

export async function togglePlanActiveAction(
  planId: string,
  isActive: boolean
): Promise<PlanActionResult> {
  const result = await getManageCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;

  try {
    await togglePlanActive(supabase, planId, isActive);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al actualizar el plan.' };
  }

  revalidatePath(REVALIDATE);
  return {};
}

export async function updateStripePriceIdAction(
  planId: string,
  stripePriceId: string
): Promise<PlanActionResult> {
  const result = await getManageCtx();
  if ('error' in result && result.error) return { error: result.error };
  const { supabase } = result as Exclude<typeof result, { error: string }>;

  try {
    await updatePlanStripePriceId(supabase, planId, stripePriceId.trim() || null);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al actualizar Stripe Price ID.' };
  }

  revalidatePath(REVALIDATE);
  return {};
}
