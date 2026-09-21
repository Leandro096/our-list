import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

import { getPlanById } from '@/services/plan.service';
import {
  logStripeEvent,
  createStripePayment,
  activateSubscriptionFromStripe,
} from '@/services/billing.service';

// Next.js App Router: disable body parsing so we can verify Stripe signature.
export const dynamic = 'force-dynamic';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoiceSucceeded(supabase, event);
        break;

      case 'invoice.payment_failed':
        await handleInvoiceFailed(supabase, event);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event);
        break;

      default:
        // Unhandled event — log and ignore.
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---- Handlers ----

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const tenantId = session.metadata?.tenant_id;
  const planId = session.metadata?.plan_id;
  const userId = session.metadata?.user_id ?? null;

  if (!tenantId || !planId) return;

  const plan = await getPlanById(supabase, planId);
  if (!plan) return;

  const stripeSubId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription?.id ?? null);

  const periodStart = new Date().toISOString();
  let periodEnd: string | null = null;

  if (stripeSubId) {
    const sub = await getStripe().subscriptions.retrieve(stripeSubId);
    const periodEndTs = sub.items.data[0]?.current_period_end ?? 0;
    periodEnd = new Date(periodEndTs * 1000).toISOString();
  }

  const subscription = await activateSubscriptionFromStripe(
    supabase,
    tenantId,
    planId,
    plan.billing_type,
    stripeSubId,
    periodStart,
    periodEnd
  );

  const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
  const currency = session.currency?.toUpperCase() ?? plan.price_currency;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await createStripePayment(supabase, {
    tenantId,
    subscriptionId: subscription.id,
    planId,
    amount: amountTotal,
    currency,
    submittedBy: userId,
    stripePaymentIntentId: paymentIntentId,
  });

  await logStripeEvent(supabase, tenantId, null, event.type, event);
}

async function handleInvoiceSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const invoice = event.data.object as Stripe.Invoice;
  const subRef = invoice.parent?.subscription_details?.subscription;
  const stripeSubId =
    typeof subRef === 'string' ? subRef : ((subRef as { id?: string } | null)?.id ?? null);

  if (!stripeSubId) return;

  // Update current_period_end on our subscription record.
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('id, tenant_id')
    .eq('stripe_subscription_id', stripeSubId)
    .single();

  if (subRow) {
    const sub = await getStripe().subscriptions.retrieve(stripeSubId);
    const periodEndTs = sub.items.data[0]?.current_period_end ?? 0;
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: new Date(periodEndTs * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', (subRow as { id: string; tenant_id: string }).id);
  }

  await logStripeEvent(
    supabase,
    (subRow as { id: string; tenant_id: string } | null)?.tenant_id ?? null,
    null,
    event.type,
    event
  );
}

async function handleInvoiceFailed(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const invoice = event.data.object as Stripe.Invoice;
  const subRef2 = invoice.parent?.subscription_details?.subscription;
  const stripeSubId =
    typeof subRef2 === 'string' ? subRef2 : ((subRef2 as { id?: string } | null)?.id ?? null);

  if (!stripeSubId) return;

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('id, tenant_id')
    .eq('stripe_subscription_id', stripeSubId)
    .single();

  if (subRow) {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', (subRow as { id: string; tenant_id: string }).id);
  }

  await logStripeEvent(
    supabase,
    (subRow as { id: string; tenant_id: string } | null)?.tenant_id ?? null,
    null,
    event.type,
    event
  );
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const stripeSub = event.data.object as Stripe.Subscription;

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('id, tenant_id')
    .eq('stripe_subscription_id', stripeSub.id)
    .single();

  if (!subRow) return;

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'pending',
    incomplete_expired: 'expired',
    trialing: 'active',
    paused: 'past_due',
  };

  const status = statusMap[stripeSub.status] ?? 'pending';

  const subPeriodEndTs = stripeSub.items.data[0]?.current_period_end ?? 0;
  await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_end: new Date(subPeriodEndTs * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', (subRow as { id: string; tenant_id: string }).id);

  await logStripeEvent(
    supabase,
    (subRow as { id: string; tenant_id: string }).tenant_id,
    null,
    event.type,
    event
  );
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const stripeSub = event.data.object as Stripe.Subscription;

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('id, tenant_id')
    .eq('stripe_subscription_id', stripeSub.id)
    .single();

  if (!subRow) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', (subRow as { id: string; tenant_id: string }).id);

  await logStripeEvent(
    supabase,
    (subRow as { id: string; tenant_id: string }).tenant_id,
    null,
    event.type,
    event
  );
}
