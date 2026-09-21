'use server';

import { revalidatePath } from 'next/cache';

import { getStripe } from '@/lib/stripe';
import { LimitError } from '@/lib/limits';
import { PERMISSIONS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { optimizeProof, ProofValidationError } from '@/lib/image-optimizer';
import { ForbiddenError, UnauthorizedError, requireTenantPermission } from '@/lib/server-auth';

import { getPlanById } from '@/services/plan.service';
import { getTenantById } from '@/services/tenant.service';
import {
  getStripeCustomerId,
  createPendingPayment,
  saveStripeCustomerId,
  createPendingSubscription,
} from '@/services/billing.service';

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
    ctx = await requireTenantPermission(supabase, PERMISSIONS.SETTINGS_BILLING_SUBMIT_PROOF);
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

  // payment-proofs is a private bucket — getPublicUrl would return a URL
  // that 403s. Store the storage path itself; readers sign it on demand via
  // getSignedProofUrl().
  const proofUrl = storagePath;

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

// ---- Stripe actions ----

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export type StripeSessionResult = { url?: string; error?: string };

/**
 * Creates a Stripe Checkout Session for the given plan.
 * Redirects the user to Stripe's hosted checkout page.
 * On success Stripe redirects to /dashboard/settings/billing?stripe=success.
 */
export async function createCheckoutSessionAction(planId: string): Promise<StripeSessionResult> {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof requireTenantPermission>>;
  try {
    ctx = await requireTenantPermission(supabase, PERMISSIONS.SETTINGS_BILLING_SUBMIT_PROOF);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso.'
            : 'Error de autorización.',
    };
  }

  const plan = await getPlanById(supabase, planId);
  if (!plan) return { error: 'Plan no encontrado.' };
  if (!plan.stripe_price_id) return { error: 'Este plan no tiene precio de Stripe configurado.' };

  const tenant = await getTenantById(supabase, ctx.tenantId);
  if (!tenant) return { error: 'Tenant no encontrado.' };

  // Get or create Stripe Customer
  let customerId = await getStripeCustomerId(supabase, ctx.tenantId);
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: undefined,
      name: tenant.name,
      metadata: { tenant_id: ctx.tenantId },
    });
    customerId = customer.id;
    await saveStripeCustomerId(supabase, ctx.tenantId, customerId);
  }

  const mode = plan.billing_type === 'one_time' ? 'payment' : 'subscription';

  try {
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${SITE_URL}/dashboard/settings/billing?stripe=success`,
      cancel_url: `${SITE_URL}/dashboard/settings/billing?stripe=cancel`,
      metadata: { tenant_id: ctx.tenantId, plan_id: planId, user_id: ctx.userId },
      allow_promotion_codes: true,
    });

    return { url: session.url ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear sesión de Stripe.';
    return { error: msg };
  }
}

/**
 * Creates a Stripe Customer Portal session so the tenant can manage their
 * subscription (upgrade, downgrade, cancel, update payment method).
 */
export async function createPortalSessionAction(): Promise<StripeSessionResult> {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof requireTenantPermission>>;
  try {
    ctx = await requireTenantPermission(supabase, PERMISSIONS.SETTINGS_BILLING_SUBMIT_PROOF);
  } catch (err) {
    return {
      error: err instanceof UnauthorizedError ? 'No autenticado.' : 'Error de autorización.',
    };
  }

  const customerId = await getStripeCustomerId(supabase, ctx.tenantId);
  if (!customerId) {
    return { error: 'No hay cuenta de Stripe vinculada. Suscríbete a un plan primero.' };
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_URL}/dashboard/settings/billing`,
    });
    return { url: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al abrir el portal de facturación.';
    return { error: msg };
  }
}
