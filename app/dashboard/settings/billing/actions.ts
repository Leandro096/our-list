'use server';

import { revalidatePath } from 'next/cache';

import { LimitError } from '@/lib/limits';
import { createClient } from '@/lib/supabase/server';
import { optimizeProof, ProofValidationError } from '@/lib/image-optimizer';
import { ForbiddenError, UnauthorizedError, requireTenantPermission } from '@/lib/server-auth';

import { createPendingPayment, createPendingSubscription } from '@/services/billing.service';

export type SubmitProofInput = {
  planId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  reference: string | null;
  billingType: 'one_time' | 'recurring';
};

export type SubmitProofResult = {
  paymentId?: string;
  error?: string;
};

/**
 * Validates, optimizes, and uploads a payment proof, then creates a pending
 * payment record linked to a pending subscription.
 *
 * Flow:
 *   1. requireTenantPermission (tenant.billing.submit)
 *   2. optimizeProof (validate + compress via sharp)
 *   3. Upload to storage/payment-proofs/{tenantId}/{paymentId}.{ext}
 *   4. createPendingSubscription (if subscriptionId not provided)
 *   5. createPendingPayment
 */
export async function submitPaymentProofAction(
  formData: FormData,
  input: SubmitProofInput
): Promise<SubmitProofResult> {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof requireTenantPermission>>;
  try {
    ctx = await requireTenantPermission(supabase, 'tenant.billing.submit');
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso para enviar comprobantes.'
            : 'Error de autorización.',
    };
  }

  const file = formData.get('proof') as File | null;
  if (!file || file.size === 0) {
    return { error: 'Debes adjuntar un comprobante de pago.' };
  }

  // Validate + optimize
  let optimized: Awaited<ReturnType<typeof optimizeProof>>;
  try {
    optimized = await optimizeProof(file);
  } catch (err) {
    if (err instanceof ProofValidationError) {
      return { error: err.message };
    }
    return { error: 'Error al procesar el archivo. Intenta de nuevo.' };
  }

  // Determine or create subscription
  let subscriptionId = input.subscriptionId;
  if (!subscriptionId) {
    try {
      const subscription = await createPendingSubscription(
        supabase,
        ctx.tenantId,
        input.planId,
        input.billingType
      );
      subscriptionId = subscription.id;
    } catch {
      return { error: 'Error al crear la suscripción. Intenta de nuevo.' };
    }
  }

  // Upload proof to storage
  const fileName = `${crypto.randomUUID()}.${optimized.extension}`;
  const storagePath = `${ctx.tenantId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(storagePath, optimized.buffer, {
      contentType: optimized.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: 'Error al subir el comprobante. Intenta de nuevo.' };
  }

  const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(storagePath);
  const proofUrl = urlData?.publicUrl ?? storagePath;

  // Create payment record
  let paymentId: string;
  try {
    const payment = await createPendingPayment(supabase, {
      tenantId: ctx.tenantId,
      subscriptionId,
      planId: input.planId,
      amount: input.amount,
      currency: input.currency,
      method: 'bank_transfer',
      proofUrl,
      reference: input.reference,
      submittedBy: ctx.userId,
    });
    paymentId = payment.id;
  } catch (err) {
    if (err instanceof LimitError) {
      return { error: err.message };
    }
    // Clean up uploaded file on payment creation failure
    await supabase.storage.from('payment-proofs').remove([storagePath]);
    return { error: 'Error al registrar el pago. Intenta de nuevo.' };
  }

  revalidatePath('/dashboard/settings/billing');
  return { paymentId };
}
