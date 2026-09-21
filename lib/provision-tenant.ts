/**
 * Workspace provisioning for new users.
 *
 * `createWorkspace` is the single, explicit entry point: it creates the
 * public.users row (if missing), the tenant, the owner membership, a default
 * event, and a PENDING subscription for the chosen plan — synchronously, so the
 * onboarding screen can show success/failure instead of relying on a flaky
 * background side-effect. It is idempotent: an active member keeps their
 * existing tenant, and a partially-created workspace is completed rather than
 * duplicated.
 *
 * Server-only: uses the service-role admin client. Never import from a client.
 */
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

import type { TenantType } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';

import { getPlanById } from '@/services/plan.service';
import { createTenant } from '@/services/tenant.service';
import { createPendingSubscription } from '@/services/billing.service';

export interface CreateWorkspaceInput {
  name: string;
  planId: string;
}

/** True if the user is an active member of any tenant. Works with the user (RLS) client. */
export async function userHasActiveMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/** Ensures the public.users row exists — tenants/tenant_members FKs depend on it. */
async function ensureUserRow(
  admin: SupabaseClient,
  user: SupabaseUser,
  displayFallback: string
): Promise<void> {
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const { error } = await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      display_name: meta.display_name || displayFallback,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

/**
 * Creates (or completes) a full workspace for `user` on the chosen plan.
 * Returns the tenant id. Throws on a hard failure so the caller can surface it.
 */
export async function createWorkspace(
  user: SupabaseUser,
  input: CreateWorkspaceInput
): Promise<{ tenantId: string }> {
  const admin = createAdminClient();
  const name = input.name.trim() || user.email?.split('@')[0] || 'Mi Workspace';

  await ensureUserRow(admin, user, name);

  // Validate the plan and derive the tenant type from its scope.
  const plan = await getPlanById(admin, input.planId);
  if (!plan) throw new Error('Plan no válido.');
  const tenantType: TenantType = plan.scope === 'organization' ? 'organization' : 'individual';

  // Resolve the target tenant WITHOUT early-returning: an existing active
  // membership or owned tenant is reused, but we still fall through to ensure
  // the subscription AND event exist. This repairs partially-created
  // workspaces (e.g. tenant + membership created but no event).
  const { data: active } = await admin
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .maybeSingle();

  let tenantId = (active as { tenant_id: string } | null)?.tenant_id ?? null;

  if (!tenantId) {
    const { data: owned } = await admin
      .from('tenants')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    tenantId = (owned as { id: string } | null)?.id ?? null;
  }

  if (!tenantId) {
    const tenant = await createTenant(admin, { name, type: tenantType, ownerId: user.id });
    tenantId = tenant.id;
  }

  // Owner membership (active).
  const { data: membership } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    const { data: ownerRole, error: ownerRoleError } = await admin
      .from('roles')
      .select('id')
      .eq('name', 'owner')
      .maybeSingle();
    if (ownerRoleError || !ownerRole) {
      throw new Error('No se encontró el rol "owner" — no se puede crear la membresía.');
    }

    const { error } = await admin.from('tenant_members').insert({
      tenant_id: tenantId,
      user_id: user.id,
      role_id: (ownerRole as { id: string }).id,
      status: 'active',
    });
    if (error) throw error;
  }

  // Pending subscription for the chosen plan (activated later via payment).
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let subscriptionId = (existingSub as { id: string } | null)?.id ?? null;
  if (!subscriptionId) {
    const sub = await createPendingSubscription(
      admin,
      tenantId,
      plan.id,
      plan.billing_type as 'one_time' | 'recurring'
    );
    subscriptionId = sub.id;
  }

  // Default event, linked to the subscription.
  const { data: existingEvent } = await admin
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle();

  if (!existingEvent) {
    const eventDate = new Date();
    eventDate.setFullYear(eventDate.getFullYear() + 1);
    const { error } = await admin.from('events').insert({
      tenant_id: tenantId,
      name,
      event_date: eventDate.toISOString().slice(0, 10),
      status: 'active',
      created_by: user.id,
      subscription_id: subscriptionId,
    });
    if (error) throw error;
  }

  return { tenantId };
}

/**
 * Safety-net repair: guarantees the tenant has at least one active event.
 * Called from the dashboard layout so a partially-provisioned tenant (member
 * but no event) never crashes getActiveContext. Idempotent and cheap.
 */
export async function ensureTenantEvent(tenantId: string, userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { data: tenant } = await admin
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle();

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const eventDate = new Date();
  eventDate.setFullYear(eventDate.getFullYear() + 1);

  const { error } = await admin.from('events').insert({
    tenant_id: tenantId,
    name: (tenant as { name: string } | null)?.name ?? 'Mi Evento',
    event_date: eventDate.toISOString().slice(0, 10),
    status: 'active',
    created_by: userId,
    subscription_id: (sub as { id: string } | null)?.id ?? null,
  });
  if (error) throw error;
}
