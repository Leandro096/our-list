/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Role, User, Permission, UserWithRoles } from '@/lib/types';

// ---- Return types ----

export type UserWithRoleAssignments = User & {
  user_roles: Array<{
    role_id: string;
    roles: Pick<Role, 'id' | 'name' | 'description'>;
  }>;
};

// ---- Queries ----

export async function getUsersWithRoles(
  supabase: SupabaseClient
): Promise<UserWithRoleAssignments[]> {
  const { data } = await supabase
    .from('users')
    .select(
      `
      *,
      user_roles!user_roles_user_id_fkey(
        role_id,
        roles(id, name, description)
      )
    `
    )
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getRoles(supabase: SupabaseClient): Promise<Role[]> {
  const { data } = await supabase.from('roles').select('*').order('name');
  return data ?? [];
}

// ---- Mutations ----

export async function assignRole(
  supabase: SupabaseClient,
  userId: string,
  roleId: string
): Promise<void> {
  const { error } = await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId });

  if (error) throw error;
}

async function removeRole(supabase: SupabaseClient, userId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);

  if (error) throw error;
}

export async function updateUserSuperAdmin(
  supabase: SupabaseClient,
  userId: string,
  isSuperAdmin: boolean
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_super_admin: isSuperAdmin })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Replaces ALL role assignments for a user with the given roleIds (upsert semantics).
 * Deletes existing roles then inserts the new set in one logical operation.
 */
export async function updateUserRoles(
  supabase: SupabaseClient,
  userId: string,
  roleIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);

  if (deleteError) throw deleteError;

  if (roleIds.length > 0) {
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert(roleIds.map((roleId) => ({ user_id: userId, role_id: roleId })));

    if (insertError) throw insertError;
  }
}

// ---- Profile ----

export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: { display_name?: string; theme_preference?: 'light' | 'dark' | 'system' }
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

// ---- Role management ----

export type RoleWithPermissions = Role & {
  role_permissions: Array<{
    permission_id: string;
    permissions: Pick<Permission, 'id' | 'scope' | 'description'>;
  }>;
};

export async function getRolesWithPermissions(
  supabase: SupabaseClient
): Promise<RoleWithPermissions[]> {
  const { data } = await supabase
    .from('roles')
    .select(
      `
      *,
      role_permissions(
        permission_id,
        permissions(id, scope, description)
      )
    `
    )
    .order('name');

  return data ?? [];
}

export async function getAllPermissions(supabase: SupabaseClient): Promise<Permission[]> {
  const { data } = await supabase.from('permissions').select('*').order('scope');
  return data ?? [];
}

async function createRole(
  supabase: SupabaseClient,
  name: string,
  description: string | null
): Promise<void> {
  const { error } = await supabase.from('roles').insert({ name, description });
  if (error) throw error;
}

export async function updateRole(
  supabase: SupabaseClient,
  roleId: string,
  name: string,
  description: string | null
): Promise<void> {
  const { error } = await supabase.from('roles').update({ name, description }).eq('id', roleId);
  if (error) throw error;
}

export async function deleteRole(supabase: SupabaseClient, roleId: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', roleId);
  if (error) throw error;
}

/**
 * Replaces ALL permission assignments for a role (upsert semantics).
 */
export async function updateRolePermissions(
  supabase: SupabaseClient,
  roleId: string,
  permissionIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId);

  if (deleteError) throw deleteError;

  if (permissionIds.length > 0) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(
        permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId }))
      );

    if (insertError) throw insertError;
  }
}

/**
 * Fetches the full user profile with roles, permissions, and active tenant/event.
 *
 * Designed for **server-side usage** (RSC layouts, server actions) so the
 * result can be passed as `initialProfile` to `<AuthProvider>`. This allows
 * the client to skip ALL Supabase calls on initial mount, avoiding the Web
 * Lock contention that causes the 8-second loading spinner on page refresh.
 *
 * Phase 1: also resolves `active_tenant_id` and `active_event_id` from
 * `tenant_members` + `events` so client components can read them via `useAuth()`.
 */
export async function getInitialProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserWithRoles | null> {
  // Run the user/roles query and the tenant membership query in parallel.
  const [{ data, error }, { data: membershipData }] = await Promise.all([
    supabase
      .from('users')
      .select(
        `
        *,
        user_roles!user_roles_user_id_fkey(
          roles(
            id,
            name,
            description,
            role_permissions(
              permissions(id, scope, description)
            )
          )
        )
      `
      )
      .eq('id', userId)
      .single(),
    supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at')
      .limit(1)
      .single(),
  ]);

  if (error || !data) return null;

  type RoleRow = {
    id: string;
    name: string;
    description: string | null;
    role_permissions: Array<{
      permissions: { id: string; scope: string; description: string | null } | null;
    }>;
  };

  const roles =
    (data.user_roles as Array<{ roles: RoleRow | null }>)
      ?.map((ur) => ur.roles)
      .filter((r): r is RoleRow => r !== null)
      .map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        // Embed permissions so AuthProvider never needs a follow-up DB query.
        permissions: role.role_permissions
          .map((rp) => rp.permissions?.scope)
          .filter((scope): scope is string => Boolean(scope)),
      })) ?? [];

  const permissions = [...new Set(roles.flatMap((r) => r.permissions ?? []))];

  const activeTenantId = (membershipData as { tenant_id: string } | null)?.tenant_id ?? null;

  // Resolve the first active event for the tenant (only if we have a tenant).
  let activeEventId: string | null = null;
  if (activeTenantId) {
    const { data: eventData } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', activeTenantId)
      .eq('status', 'active')
      .order('created_at')
      .limit(1)
      .single();
    activeEventId = (eventData as { id: string } | null)?.id ?? null;
  }

  const { user_roles: _omit, ...userData } = data;
  return {
    ...userData,
    roles,
    permissions,
    active_tenant_id: activeTenantId,
    active_event_id: activeEventId,
  } as UserWithRoles;
}
