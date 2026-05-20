import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role, User } from '@/lib/types'

// ---- Return types ----

export type UserWithRoleAssignments = User & {
  user_roles: Array<{
    role_id: string
    roles: Pick<Role, 'id' | 'name' | 'description'>
  }>
}

// ---- Queries ----

export async function getUsersWithRoles(
  supabase: SupabaseClient,
): Promise<UserWithRoleAssignments[]> {
  const { data } = await supabase
    .from('users')
    .select(`
      *,
      user_roles(
        role_id,
        roles(id, name, description)
      )
    `)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getRoles(supabase: SupabaseClient): Promise<Role[]> {
  const { data } = await supabase.from('roles').select('*').order('name')
  return data ?? []
}

// ---- Mutations ----

export async function assignRole(
  supabase: SupabaseClient,
  userId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId })

  if (error) throw error
}

export async function removeRole(
  supabase: SupabaseClient,
  userId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)

  if (error) throw error
}
