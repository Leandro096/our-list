import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role, User, Permission } from '@/lib/types'

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
      user_roles!user_roles_user_id_fkey(
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

export async function updateUserSuperAdmin(
  supabase: SupabaseClient,
  userId: string,
  isSuperAdmin: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_super_admin: isSuperAdmin })
    .eq('id', userId)

  if (error) throw error
}

/**
 * Replaces ALL role assignments for a user with the given roleIds (upsert semantics).
 * Deletes existing roles then inserts the new set in one logical operation.
 */
export async function updateUserRoles(
  supabase: SupabaseClient,
  userId: string,
  roleIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw deleteError

  if (roleIds.length > 0) {
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert(roleIds.map((roleId) => ({ user_id: userId, role_id: roleId })))

    if (insertError) throw insertError
  }
}

// ---- Role management ----

export type RoleWithPermissions = Role & {
  role_permissions: Array<{
    permission_id: string
    permissions: Pick<Permission, 'id' | 'scope' | 'description'>
  }>
}

export async function getRolesWithPermissions(
  supabase: SupabaseClient,
): Promise<RoleWithPermissions[]> {
  const { data } = await supabase
    .from('roles')
    .select(`
      *,
      role_permissions(
        permission_id,
        permissions(id, scope, description)
      )
    `)
    .order('name')

  return data ?? []
}

export async function getAllPermissions(
  supabase: SupabaseClient,
): Promise<Permission[]> {
  const { data } = await supabase.from('permissions').select('*').order('scope')
  return data ?? []
}

export async function createRole(
  supabase: SupabaseClient,
  name: string,
  description: string | null,
): Promise<void> {
  const { error } = await supabase.from('roles').insert({ name, description })
  if (error) throw error
}

export async function updateRole(
  supabase: SupabaseClient,
  roleId: string,
  name: string,
  description: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('roles')
    .update({ name, description })
    .eq('id', roleId)
  if (error) throw error
}

export async function deleteRole(
  supabase: SupabaseClient,
  roleId: string,
): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', roleId)
  if (error) throw error
}

/**
 * Replaces ALL permission assignments for a role (upsert semantics).
 */
export async function updateRolePermissions(
  supabase: SupabaseClient,
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) throw deleteError

  if (permissionIds.length > 0) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })))

    if (insertError) throw insertError
  }
}
