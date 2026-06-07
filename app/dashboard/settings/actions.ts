'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, ForbiddenError, UnauthorizedError } from '@/lib/server-auth';

import {
  updateRole,
  deleteRole,
  updateUserRoles,
  updateUserProfile,
  updateUserSuperAdmin,
  updateRolePermissions,
} from '@/services';

// ---- Profile ---------------------------------------------------------------

export async function updateUserProfileAction(
  _userId: string,
  payload: { display_name?: string; theme_preference?: 'light' | 'dark' | 'system' }
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');
  await updateUserProfile(supabase, user.id, payload);
  revalidatePath('/dashboard/profile');
}

/**
 * Changes the authenticated user's password.
 * Uses the admin client so the operation is server-side and doesn't depend on
 * the browser Supabase singleton (which can have a stale refreshingPromise).
 */
export async function updatePasswordAction(newPassword: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) throw error;
}

// ---- User management -------------------------------------------------------

export async function updateUserSuperAdminAction(
  userId: string,
  isSuperAdmin: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await requireAuth(supabase, PERMISSIONS.SETTINGS_USERS);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso.'
            : 'Error de autorización.',
    };
  }
  await updateUserSuperAdmin(supabase, userId, isSuperAdmin);
  revalidatePath('/dashboard/settings/users');
  return {};
}

export async function updateUserRolesAction(
  userId: string,
  roleIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await requireAuth(supabase, PERMISSIONS.SETTINGS_USERS);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso.'
            : 'Error de autorización.',
    };
  }
  await updateUserRoles(supabase, userId, roleIds);
  revalidatePath('/dashboard/settings/users');
  return {};
}

// ---- Roles -----------------------------------------------------------------

export async function createRoleAction(
  name: string,
  description: string | null
): Promise<{ id: string; error?: string }> {
  const supabase = await createClient();
  try {
    await requireAuth(supabase, PERMISSIONS.SETTINGS_ROLES);
  } catch (err) {
    return {
      id: '',
      error: err instanceof UnauthorizedError ? 'No autenticado.' : 'Sin permiso para crear roles.',
    };
  }
  const { data, error } = await supabase
    .from('roles')
    .insert({ name, description })
    .select('id')
    .single();
  if (error) throw error;
  revalidatePath('/dashboard/settings/roles');
  return { id: data.id };
}

export async function updateRoleAction(
  roleId: string,
  name: string,
  description: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await requireAuth(supabase, PERMISSIONS.SETTINGS_ROLES);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError ? 'No autenticado.' : 'Sin permiso para editar roles.',
    };
  }
  await updateRole(supabase, roleId, name, description);
  revalidatePath('/dashboard/settings/roles');
  return {};
}

export async function deleteRoleAction(roleId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await requireAuth(supabase, PERMISSIONS.SETTINGS_ROLES);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError ? 'No autenticado.' : 'Sin permiso para eliminar roles.',
    };
  }
  await deleteRole(supabase, roleId);
  revalidatePath('/dashboard/settings/roles');
  return {};
}

export async function updateRolePermissionsAction(
  roleId: string,
  permissionIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await requireAuth(supabase, PERMISSIONS.SETTINGS_ROLES);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError ? 'No autenticado.' : 'Sin permiso para editar permisos.',
    };
  }
  await updateRolePermissions(supabase, roleId, permissionIds);
  revalidatePath('/dashboard/settings/roles');
  return {};
}
