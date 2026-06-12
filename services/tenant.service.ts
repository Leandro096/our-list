import type { SupabaseClient } from '@supabase/supabase-js';

import type { Tenant, TenantMember, TenantMemberWithUser } from '@/lib/types';

// ---- Queries ----

export async function getActiveTenantForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ tenant: Tenant; memberId: string } | null> {
  const { data } = await supabase
    .from('tenant_members')
    .select('id, tenants(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .single();

  if (!data) return null;

  type Row = { id: string; tenants: Tenant | null };
  const row = data as unknown as Row;
  if (!row.tenants) return null;

  return { tenant: row.tenants, memberId: row.id };
}

export async function getTenantById(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Tenant | null> {
  const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
  return (data as Tenant | null) ?? null;
}

export async function getTenantMembers(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantMemberWithUser[]> {
  const { data } = await supabase
    .from('tenant_members')
    .select('*, users(id, email, display_name), roles(id, name)')
    .eq('tenant_id', tenantId)
    .order('created_at');

  return (data as unknown as TenantMemberWithUser[]) ?? [];
}

export async function getTenantMembership(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<TenantMember | null> {
  const { data } = await supabase
    .from('tenant_members')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single();

  return (data as TenantMember | null) ?? null;
}

// ---- Mutations ----

export async function updateTenant(
  supabase: SupabaseClient,
  tenantId: string,
  payload: Partial<Pick<Tenant, 'name' | 'subdomain'>>
): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) throw error;
}
