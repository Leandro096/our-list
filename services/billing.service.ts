import type Stripe from 'stripe';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Payment, PaymentEvent, Subscription } from '@/lib/types';

// ---- Return types ----

export type PaymentWithTenant = Payment & {
  tenants: { name: string } | null;
  plans: { name: string; code: string } | null;
};

export type SubscriptionWithDetails = Subscription & {
  plans: { name: string; code: string; billing_type: string } | null;
};

// ---- Queries ----

export async function getPaymentsForTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Payment[]> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('submitted_at', { ascending: false });

  return (data as Payment[]) ?? [];
}

export async function getPaymentById(
  supabase: SupabaseClient,
  paymentId: string
): Promise<Payment | null> {
  const { data } = await supabase.from('payments').select('*').eq('id', paymentId).single();
  return (data as Payment | null) ?? null;
}

export async function getPendingPayments(supabase: SupabaseClient): Promise<PaymentWithTenant[]> {
  const { data } = await supabase
    .from('payments')
    .select('*, tenants(name), plans(name, code)')
    .eq('status', 'pending')
    .order('submitted_at');

  return (data as unknown as PaymentWithTenant[]) ?? [];
}

export async function getAllPayments(
  supabase: SupabaseClient,
  limit = 100
): Promise<PaymentWithTenant[]> {
  const { data } = await supabase
    .from('payments')
    .select('*, tenants(name), plans(name, code)')
    .order('submitted_at', { ascending: false })
    .limit(limit);

  return (data as unknown as PaymentWithTenant[]) ?? [];
}

export async function getPaymentEvents(
  supabase: SupabaseClient,
  paymentId: string
): Promise<PaymentEvent[]> {
  const { data } = await supabase
    .from('payment_events')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at');

  return (data as PaymentEvent[]) ?? [];
}

export async function getActiveSubscription(
  supabase: SupabaseClient,
  tenantId: string
): Promise<SubscriptionWithDetails | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plans(name, code, billing_type)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return (data as unknown as SubscriptionWithDetails | null) ?? null;
}

/**
 * The `payment-proofs` bucket is private — signs a short-lived URL for a
 * stored proof path. Returns null if the path is empty or signing fails
 * (e.g. the caller lacks the storage RLS read policy for that folder).
 */
export async function getSignedProofUrl(
  supabase: SupabaseClient,
  path: string | null,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Lightweight check: does the tenant have at least one active subscription? */
export async function tenantHasActiveSubscription(
  supabase: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

// ---- Mutations ----

export type SubmitPaymentInput = {
  tenantId: string;
  subscriptionId: string;
  planId: string;
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'card' | 'manual';
  proofUrl: string;
  reference: string | null;
  submittedBy: string;
};

export async function createPendingPayment(
  supabase: SupabaseClient,
  input: SubmitPaymentInput
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      tenant_id: input.tenantId,
      subscription_id: input.subscriptionId,
      plan_id: input.planId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      status: 'pending',
      proof_url: input.proofUrl,
      reference: input.reference,
      submitted_by: input.submittedBy,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Payment;
}

/**
 * Atomically confirms a payment, activates the subscription, and logs to
 * payment_events — all via the `confirm_payment` SQL function.
 */
export async function confirmPayment(
  supabase: SupabaseClient,
  paymentId: string,
  reviewedBy: string,
  notes: string | null
): Promise<{ ok: boolean; error?: string; subscription_id?: string }> {
  const { data, error } = await supabase.rpc('confirm_payment', {
    p_payment_id: paymentId,
    p_reviewed_by: reviewedBy,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as { ok: boolean; error?: string; subscription_id?: string };
}

/**
 * Marks a payment as rejected and logs to payment_events.
 */
export async function rejectPayment(
  supabase: SupabaseClient,
  paymentId: string,
  reviewedBy: string,
  notes: string
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('reject_payment', {
    p_payment_id: paymentId,
    p_reviewed_by: reviewedBy,
    p_notes: notes,
  });

  if (error) throw error;
  return data as { ok: boolean; error?: string };
}

// ---- Stripe helpers ----

/** Reads the Stripe customer ID stored on the tenant row. */
export async function getStripeCustomerId(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single();
  return (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;
}

/** Persists the Stripe customer ID on the tenant row after creation. */
export async function saveStripeCustomerId(
  supabase: SupabaseClient,
  tenantId: string,
  customerId: string
): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ stripe_customer_id: customerId })
    .eq('id', tenantId);
  if (error) throw error;
}

/**
 * Activates (or upserts) the tenant subscription after a successful Stripe
 * webhook event (checkout.session.completed / invoice.payment_succeeded).
 */
export async function activateSubscriptionFromStripe(
  supabase: SupabaseClient,
  tenantId: string,
  planId: string,
  billingType: 'one_time' | 'recurring',
  stripeSubscriptionId: string | null,
  periodStart: string | null,
  periodEnd: string | null
): Promise<Subscription> {
  // Try to find an existing pending subscription for this tenant+plan.
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('plan_id', planId)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as Subscription).id)
      .select()
      .single();
    if (error) throw error;
    return data as Subscription;
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      tenant_id: tenantId,
      plan_id: planId,
      billing_type: billingType,
      status: 'active',
      stripe_subscription_id: stripeSubscriptionId,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Subscription;
}

/** Logs a Stripe webhook event to `payment_events` for full audit trail. */
export async function logStripeEvent(
  supabase: SupabaseClient,
  tenantId: string | null,
  paymentId: string | null,
  eventType: string,
  rawPayload: Stripe.Event
): Promise<void> {
  await supabase.from('payment_events').insert({
    tenant_id: tenantId,
    payment_id: paymentId,
    source: 'stripe',
    event_type: eventType,
    raw_payload: rawPayload as unknown as Record<string, unknown>,
  });
}

/**
 * Creates a confirmed payment record for a Stripe card charge.
 * Called from the webhook after checkout.session.completed.
 */
export async function createStripePayment(
  supabase: SupabaseClient,
  {
    tenantId,
    subscriptionId,
    planId,
    amount,
    currency,
    submittedBy,
    stripePaymentIntentId,
  }: {
    tenantId: string;
    subscriptionId: string;
    planId: string;
    amount: number;
    currency: string;
    submittedBy: string | null;
    stripePaymentIntentId: string | null;
  }
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      tenant_id: tenantId,
      subscription_id: subscriptionId,
      plan_id: planId,
      amount,
      currency: currency.toUpperCase(),
      method: 'card',
      status: 'confirmed',
      submitted_by: submittedBy,
      submitted_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      stripe_payment_intent_id: stripePaymentIntentId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Payment;
}

/**
 * Creates a pending subscription for a tenant+plan.
 * Used during the payment proof submission flow before the payment is confirmed.
 */
export async function createPendingSubscription(
  supabase: SupabaseClient,
  tenantId: string,
  planId: string,
  billingType: 'one_time' | 'recurring'
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      tenant_id: tenantId,
      plan_id: planId,
      billing_type: billingType,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
}
