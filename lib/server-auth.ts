/**
 * Server-side authorization helpers for Server Actions.
 *
 * These functions query the database directly and must NEVER be used on the
 * client. They are the source of truth for permission checks — the client-side
 * PermissionGuard is UI-only and does NOT prevent unauthorized API calls.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { hasPermission } from './permissions';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Resolves the authenticated user's permissions from the database.
 *
 * Returns `{ userId, isSuperAdmin, permissions }` or throws `UnauthorizedError`
 * when there is no active session.
 *
 * Always queries the DB — never trusts client-supplied state.
 */
export async function getServerPermissions(supabase: SupabaseClient): Promise<{
  userId: string;
  isSuperAdmin: boolean;
  permissions: string[];
}> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError();
  }

  // Fetch is_super_admin and all permission scopes assigned through roles
  const { data: profile } = await supabase
    .from('users')
    .select(
      `
      is_super_admin,
      user_roles!user_roles_user_id_fkey(
        roles(
          role_permissions(
            permissions(scope)
          )
        )
      )
    `
    )
    .eq('id', user.id)
    .single();

  const isSuperAdmin = (profile as { is_super_admin?: boolean } | null)?.is_super_admin ?? false;

  type RoleRow = {
    roles: {
      role_permissions: Array<{ permissions: { scope: string } | null }>;
    } | null;
  };

  const permissions: string[] = [
    ...new Set(
      ((profile as unknown as { user_roles?: RoleRow[] } | null)?.user_roles ?? []).flatMap((ur) =>
        (ur.roles?.role_permissions ?? []).flatMap((rp) =>
          rp.permissions?.scope ? [rp.permissions.scope] : []
        )
      )
    ),
  ];

  return { userId: user.id, isSuperAdmin, permissions };
}

/**
 * Asserts that the current session has the required permission scope.
 *
 * Throws `UnauthorizedError` when not authenticated.
 * Throws `ForbiddenError` when authenticated but lacking the permission.
 */
export async function requireAuth(
  supabase: SupabaseClient,
  permission: string
): Promise<{ userId: string; isSuperAdmin: boolean; permissions: string[] }> {
  const ctx = await getServerPermissions(supabase);

  if (!hasPermission(ctx.permissions, permission, ctx.isSuperAdmin)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return ctx;
}
