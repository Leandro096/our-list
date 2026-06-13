import type { SupabaseClient } from '@supabase/supabase-js';

import type { Plan, Feature, PlanWithFeatures } from '@/lib/types';

// ---- Queries ----

export async function getPlans(supabase: SupabaseClient): Promise<Plan[]> {
  const { data } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_amount');

  return (data as Plan[]) ?? [];
}

export async function getPlanById(supabase: SupabaseClient, planId: string): Promise<Plan | null> {
  const { data } = await supabase.from('plans').select('*').eq('id', planId).single();
  return (data as Plan | null) ?? null;
}

export async function getPlanWithFeatures(
  supabase: SupabaseClient,
  planId: string
): Promise<PlanWithFeatures | null> {
  const { data } = await supabase
    .from('plans')
    .select('*, plan_features(enabled, features(id, key, name, description))')
    .eq('id', planId)
    .single();

  if (!data) return null;

  type PlanRow = Plan & {
    plan_features: Array<{ enabled: boolean; features: Feature | null }>;
  };

  const row = data as unknown as PlanRow;
  const features = row.plan_features
    .filter((pf) => pf.enabled && pf.features)
    .map((pf) => pf.features!);

  return { ...row, features } as PlanWithFeatures;
}

export async function getAllPlansWithFeatures(
  supabase: SupabaseClient
): Promise<PlanWithFeatures[]> {
  const { data } = await supabase
    .from('plans')
    .select('*, plan_features(enabled, features(id, key, name, description))')
    .eq('is_active', true)
    .order('price_amount');

  if (!data) return [];

  type PlanRow = Plan & {
    plan_features: Array<{ enabled: boolean; features: Feature | null }>;
  };

  return (data as unknown as PlanRow[]).map((row) => ({
    ...row,
    features: row.plan_features.filter((pf) => pf.enabled && pf.features).map((pf) => pf.features!),
  })) as PlanWithFeatures[];
}

export async function getTenantPlan(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PlanWithFeatures | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(
      `
      plans(
        *,
        plan_features(enabled, features(id, key, name, description))
      )
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  type Row = {
    plans: (Plan & { plan_features: Array<{ enabled: boolean; features: Feature | null }> }) | null;
  };

  const row = data as unknown as Row;
  if (!row.plans) return null;

  const features = row.plans.plan_features
    .filter((pf) => pf.enabled && pf.features)
    .map((pf) => pf.features!);

  return { ...row.plans, features } as PlanWithFeatures;
}
