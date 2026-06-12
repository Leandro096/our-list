'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { requirePlatformPermission, ForbiddenError, UnauthorizedError } from '@/lib/server-auth';
import { confirmPayment, rejectPayment } from '@/services/billing.service';

export type BillingActionResult = {
  ok: boolean;
  error?: string;
};

/**
 * Confirms a pending payment and activates the linked subscription.
 * Requires platform permission: platform.billing.confirm
 */
export async function confirmPaymentAction(
  paymentId: string,
  notes: string | null
): Promise<BillingActionResult> {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof requirePlatformPermission>>;
  try {
    ctx = await requirePlatformPermission(supabase, 'platform.billing.confirm');
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso para confirmar pagos.'
            : 'Error de autorización.',
    };
  }

  const result = await confirmPayment(supabase, paymentId, ctx.userId, notes);

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'No se pudo confirmar el pago.' };
  }

  revalidatePath('/admin/billing');
  return { ok: true };
}

/**
 * Rejects a pending payment.
 * Requires platform permission: platform.billing.reject
 * `reason` is required so there is always an audit trail.
 */
export async function rejectPaymentAction(
  paymentId: string,
  reason: string
): Promise<BillingActionResult> {
  if (!reason.trim()) {
    return { ok: false, error: 'Debes indicar el motivo del rechazo.' };
  }

  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof requirePlatformPermission>>;
  try {
    ctx = await requirePlatformPermission(supabase, 'platform.billing.reject');
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso para rechazar pagos.'
            : 'Error de autorización.',
    };
  }

  const result = await rejectPayment(supabase, paymentId, ctx.userId, reason);

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'No se pudo rechazar el pago.' };
  }

  revalidatePath('/admin/billing');
  return { ok: true };
}
