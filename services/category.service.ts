import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from '@/lib/types';

// ---- Return types ----

export type CategoryWithCount = Category & { guestCount: number };

// ---- Input types ----

export type CategoryInput = Pick<Category, 'name' | 'color' | 'description'>;

// ---- Queries ----

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getCategoriesWithGuestCount(
  supabase: SupabaseClient
): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, guest_categories(count)')
    .order('name');

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
): Promise<void> {
  const { error } = await supabase.from('categories').insert({
    name: input.name,
    color: input.color,
    description: input.description || null,
  });

  if (error) throw error;
}

export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  input: CategoryInput
): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({
      name: input.name,
      color: input.color,
      description: input.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteCategory(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) throw error;
}
