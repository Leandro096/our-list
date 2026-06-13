import type { SupabaseClient } from '@supabase/supabase-js';

import type { Tenant, PlatformRole, PlatformPermission } from '@/lib/types';

// ---- Tenant management ----

export async function suspendTenant(supabase: SupabaseClient, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', tenantId);
  if (error) throw error;
}

export async function reactivateTenant(supabase: SupabaseClient, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', tenantId);
  if (error) throw error;
}

export async function changeTenantPlan(
  supabase: SupabaseClient,
  tenantId: string,
  planId: string,
  billingType: 'one_time' | 'recurring'
): Promise<void> {
  // Cancel any active subscription first
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  // Create the new active subscription (admin override — no payment required)
  const { error } = await supabase.from('subscriptions').insert({
    tenant_id: tenantId,
    plan_id: planId,
    billing_type: billingType,
    status: 'active',
    current_period_start: new Date().toISOString(),
  });

  if (error) throw error;
}

// ---- Platform roles ----

export type PlatformRoleWithPermissions = PlatformRole & {
  permissions: PlatformPermission[];
};

export async function getPlatformRoles(
  supabase: SupabaseClient
): Promise<PlatformRoleWithPermissions[]> {
  const { data } = await supabase
    .from('platform_roles')
    .select('*, platform_role_permissions(platform_permissions(id, scope, name, description))')
    .order('name');

  if (!data) return [];

  type RoleRow = PlatformRole & {
    platform_role_permissions: Array<{ platform_permissions: PlatformPermission | null }>;
  };

  return (data as unknown as RoleRow[]).map((row) => ({
    ...row,
    permissions: row.platform_role_permissions
      .map((rp) => rp.platform_permissions)
      .filter(Boolean) as PlatformPermission[],
  }));
}

export type PlatformUserWithRoles = {
  id: string;
  email: string;
  display_name: string | null;
  roles: Pick<PlatformRole, 'id' | 'name'>[];
};

export async function getPlatformUsers(supabase: SupabaseClient): Promise<PlatformUserWithRoles[]> {
  const { data } = await supabase
    .from('platform_user_roles')
    .select('user_id, platform_roles(id, name), users(id, email, display_name)')
    .order('assigned_at', { ascending: false });

  if (!data) return [];

  type Row = {
    user_id: string;
    platform_roles: Pick<PlatformRole, 'id' | 'name'> | null;
    users: { id: string; email: string; display_name: string | null } | null;
  };

  const byUser = new Map<string, PlatformUserWithRoles>();
  for (const row of data as unknown as Row[]) {
    if (!row.users) continue;
    const existing = byUser.get(row.user_id);
    const role = row.platform_roles;
    if (existing) {
      if (role) existing.roles.push(role);
    } else {
      byUser.set(row.user_id, {
        id: row.users.id,
        email: row.users.email,
        display_name: row.users.display_name,
        roles: role ? [role] : [],
      });
    }
  }

  return Array.from(byUser.values());
}

export async function assignPlatformRole(
  supabase: SupabaseClient,
  userId: string,
  roleId: string,
  assignedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('platform_user_roles')
    .upsert(
      { user_id: userId, role_id: roleId, assigned_by: assignedBy },
      { onConflict: 'user_id,role_id' }
    );
  if (error) throw error;
}

export async function revokePlatformRole(
  supabase: SupabaseClient,
  userId: string,
  roleId: string
): Promise<void> {
  const { error } = await supabase
    .from('platform_user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);
  if (error) throw error;
}

// ---- Plan management ----

export async function togglePlanActive(
  supabase: SupabaseClient,
  planId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase.from('plans').update({ is_active: isActive }).eq('id', planId);
  if (error) throw error;
}

export async function updatePlanStripePriceId(
  supabase: SupabaseClient,
  planId: string,
  stripePriceId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update({ stripe_price_id: stripePriceId })
    .eq('id', planId);
  if (error) throw error;
}

// ---- Tenant details for admin ----

export type TenantWithPlan = Tenant & {
  plan_name: string | null;
  plan_code: string | null;
  subscription_status: string | null;
};

export async function getAllTenantsWithPlan(supabase: SupabaseClient): Promise<TenantWithPlan[]> {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (!tenants) return [];

  const tenantIds = (tenants as Tenant[]).map((t) => t.id);

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('tenant_id, status, plans(name, code)')
    .in('tenant_id', tenantIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  type SubRow = { tenant_id: string; status: string; plans: { name: string; code: string } | null };
  const subMap = new Map<string, SubRow>();
  for (const s of (subs as unknown as SubRow[]) ?? []) {
    if (!subMap.has(s.tenant_id)) subMap.set(s.tenant_id, s);
  }

  return (tenants as Tenant[]).map((t) => {
    const sub = subMap.get(t.id);
    return {
      ...t,
      plan_name: sub?.plans?.name ?? null,
      plan_code: sub?.plans?.code ?? null,
      subscription_status: sub?.status ?? null,
    };
  });
}
