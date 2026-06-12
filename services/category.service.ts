import type { SupabaseClient } from '@supabase/supabase-js';

import type { Category } from '@/lib/types';

// ---- Return types ----

export type CategoryWithCount = Category & { guestCount: number };

// ---- Input types ----

export type CategoryInput = Pick<Category, 'name' | 'color' | 'description'> & {
  event_id?: string | null;
};

// ---- Queries ----

export async function getCategories(
  supabase: SupabaseClient,
  eventId?: string | null
): Promise<Category[]> {
  let query = supabase.from('categories').select('*').order('name');
  if (eventId) query = query.eq('event_id', eventId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCategoriesWithGuestCount(
  supabase: SupabaseClient,
  eventId?: string | null
): Promise<CategoryWithCount[]> {
  let query = supabase.from('categories').select('*, guest_categories(count)').order('name');
  if (eventId) query = query.eq('event_id', eventId);
  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((cat) => ({
    ...cat,
    guestCount: Number((cat.guest_categories as unknown as [{ count: string }])?.[0]?.count ?? 0),
  }));
}

// ---- Mutations ----

export async function createCategory(
  supabase: SupabaseClient,
  input: CategoryInput
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: input.name,
      color: input.color,
      description: input.description || null,
      event_id: input.event_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  input: CategoryInput
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({
      name: input.name,
      color: input.color,
      description: input.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) throw error;
}
