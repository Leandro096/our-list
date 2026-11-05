'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { requireAuth } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface CreateUserInput {
  email: string;
  password: string;
  displayName?: string;
  roleIds: string[];
  isSuperAdmin: boolean;
}

export interface UpdateUserInput {
  userId: string;
  displayName?: string;
  email?: string;
  /** Leave empty to keep the current password. */
  password?: string;
  roleIds: string[];
  isSuperAdmin: boolean;
}

const MIN_PASSWORD_LENGTH = 6;

async function authorize() {
  const supabase = await createClient();
  return requireAuth(supabase, PERMISSIONS.SETTINGS_USERS);
}

/**
 * Creates a user directly (no public sign-up, no email confirmation).
 * Only callable by someone with the SETTINGS_USERS permission.
 */
export async function createUserAction(input: CreateUserInput): Promise<void> {
  const ctx = await authorize();

  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('El correo es obligatorio.');
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (input.isSuperAdmin && !ctx.isSuperAdmin) {
    throw new Error('Solo un Super Admin puede crear otro Super Admin.');
  }

  const displayName = input.displayName?.trim() || email.split('@')[0];
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(error?.message ?? 'No se pudo crear el usuario.');

  const userId = data.user.id;

  // Make sure the profile row exists (a DB trigger may already have created it).
  const { error: profileError } = await admin.from('users').upsert(
    {
      id: userId,
      email,
      display_name: displayName,
      is_super_admin: input.isSuperAdmin,
    },
    { onConflict: 'id' }
  );
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  if (input.roleIds.length > 0) {
    const { error: rolesError } = await admin
      .from('user_roles')
      .insert(input.roleIds.map((role_id) => ({ user_id: userId, role_id })));
    if (rolesError) throw new Error(rolesError.message);
  }

  revalidatePath('/dashboard/settings/users');
}

/**
 * Updates name, email, password, super-admin flag and roles of a user.
 */
export async function updateUserAction(input: UpdateUserInput): Promise<void> {
  const ctx = await authorize();
  const admin = createAdminClient();
  const isSelf = ctx.userId === input.userId;

  const { data: target, error: targetError } = await admin
    .from('users')
    .select('is_super_admin, email')
    .eq('id', input.userId)
    .single();
  if (targetError || !target) throw new Error('Usuario no encontrado.');

  const currentlySuper = Boolean(target.is_super_admin);
  if (currentlySuper !== input.isSuperAdmin) {
    if (!ctx.isSuperAdmin) {
      throw new Error('Solo un Super Admin puede cambiar el estado de Super Admin.');
    }
    if (isSelf && !input.isSuperAdmin) {
      throw new Error('No puedes quitarte a ti mismo el rol de Super Admin.');
    }
  }
  if (currentlySuper && !ctx.isSuperAdmin) {
    throw new Error('Solo un Super Admin puede modificar a otro Super Admin.');
  }

  const authUpdate: { email?: string; password?: string; user_metadata?: object } = {};
  const email = input.email?.trim().toLowerCase();
  const profileUpdate: Record<string, unknown> = {
    is_super_admin: input.isSuperAdmin,
    updated_at: new Date().toISOString(),
  };

  if (email && email !== target.email) {
    authUpdate.email = email;
    profileUpdate.email = email;
  }
  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    profileUpdate.display_name = name || null;
    authUpdate.user_metadata = { display_name: name };
  }
  if (input.password) {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    authUpdate.password = input.password;
  }

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(input.userId, {
      ...authUpdate,
      ...(authUpdate.email ? { email_confirm: true } : {}),
    });
    if (error) throw new Error(error.message);
  }

  const { error: profileError } = await admin
    .from('users')
    .update(profileUpdate)
    .eq('id', input.userId);
  if (profileError) throw new Error(profileError.message);

  const { error: deleteError } = await admin
    .from('user_roles')
    .delete()
    .eq('user_id', input.userId);
  if (deleteError) throw new Error(deleteError.message);

  if (input.roleIds.length > 0) {
    const { error: insertError } = await admin
      .from('user_roles')
      .insert(input.roleIds.map((role_id) => ({ user_id: input.userId, role_id })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath('/dashboard/settings/users');
}

/**
 * Permanently removes a user (auth account + profile + role assignments).
 */
export async function deleteUserAction(userId: string): Promise<void> {
  const ctx = await authorize();
  if (ctx.userId === userId) throw new Error('No puedes eliminar tu propia cuenta.');

  const admin = createAdminClient();

  const { data: target } = await admin
    .from('users')
    .select('is_super_admin')
    .eq('id', userId)
    .single();
  if (target?.is_super_admin && !ctx.isSuperAdmin) {
    throw new Error('Solo un Super Admin puede eliminar a otro Super Admin.');
  }

  await admin.from('user_roles').delete().eq('user_id', userId);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  // Remove the profile row if no cascade did it already.
  await admin.from('users').delete().eq('id', userId);

  revalidatePath('/dashboard/settings/users');
}
