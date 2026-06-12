/**
 * Server-side authorization helpers for Server Actions.
 *
 * These functions query the database directly and must NEVER be used on the
 * client. They are the source of truth for permission checks — the client-side
 * PermissionGuard is UI-only and does NOT prevent unauthorized API calls.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { hasPermission, hasPlatformPermission } from './permissions';

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

// ================================================================
// MULTI-TENANT CONTEXT HELPERS (Phase 1+)
// These resolve the active tenant + event for the authenticated
// user and are the correct entry-point for all scoped server actions.
// ================================================================

export interface ActiveContext {
  userId: string;
  tenantId: string;
  eventId: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

/**
 * Resolves { userId, tenantId, eventId, permissions } for the current session.
 *
 * - Reads the user's first active `tenant_members` row.
 * - Resolves permissions from the tenant role.
 * - Reads the first active `events` row for that tenant.
 *
 * Throws `UnauthorizedError` when not authenticated.
 * Throws `ForbiddenError` when the user has no active tenant membership or event.
 */
export async function getActiveContext(supabase: SupabaseClient): Promise<ActiveContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new UnauthorizedError();

  const { data: membership } = await supabase
    .from('tenant_members')
    .select(
      `
      tenant_id,
      roles(
        role_permissions(
          permissions(scope)
        )
      )
    `
    )
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .single();

  if (!membership) throw new ForbiddenError('No active tenant membership');

  type RoleData = {
    role_permissions: Array<{ permissions: { scope: string } | null }>;
  };
  const m = membership as unknown as { tenant_id: string; roles: RoleData | null };

  const permissions = [
    ...new Set(
      (m.roles?.role_permissions ?? []).flatMap((rp) =>
        rp.permissions?.scope ? [rp.permissions.scope] : []
      )
    ),
  ];

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('tenant_id', m.tenant_id)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .single();

  if (!event) throw new ForbiddenError('No active event found for tenant');

  const { data: userRecord } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  return {
    userId: user.id,
    tenantId: m.tenant_id,
    eventId: (event as { id: string }).id,
    permissions,
    isSuperAdmin: (userRecord as { is_super_admin?: boolean } | null)?.is_super_admin ?? false,
  };
}

/**
 * Resolves the active context AND asserts the user holds `permission`.
 * Throws `ForbiddenError` when the permission is missing.
 */
export async function requireTenantPermission(
  supabase: SupabaseClient,
  permission: string
): Promise<ActiveContext> {
  const ctx = await getActiveContext(supabase);
  if (!hasPermission(ctx.permissions, permission, ctx.isSuperAdmin)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return ctx;
}

// ================================================================
// PLATFORM-LEVEL CONTEXT HELPERS
// Used by /admin routes — separate from tenant-level scoping.
// ================================================================

export interface PlatformContext {
  userId: string;
  platformPermissions: string[];
}

/**
 * Resolves platform-level permissions for the current session.
 * Reads `platform_user_roles → platform_roles → platform_permissions`.
 */
export async function getPlatformContext(supabase: SupabaseClient): Promise<PlatformContext> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new UnauthorizedError();

  const { data: rows } = await supabase
    .from('platform_user_roles')
    .select(
      `
      platform_roles(
        platform_role_permissions(
          platform_permissions(scope)
        )
      )
    `
    )
    .eq('user_id', user.id);

  type PlatformRoleRow = {
    platform_roles: {
      platform_role_permissions: Array<{
        platform_permissions: { scope: string } | null;
      }>;
    } | null;
  };

  const platformPermissions = [
    ...new Set(
      ((rows as unknown as PlatformRoleRow[]) ?? []).flatMap((row) =>
        (row.platform_roles?.platform_role_permissions ?? []).flatMap((prp) =>
          prp.platform_permissions?.scope ? [prp.platform_permissions.scope] : []
        )
      )
    ),
  ];

  return { userId: user.id, platformPermissions };
}

/**
 * Resolves platform context AND asserts the user holds `permission`.
 * Throws `ForbiddenError` when the permission is missing.
 */
export async function requirePlatformPermission(
  supabase: SupabaseClient,
  permission: string
): Promise<PlatformContext> {
  const ctx = await getPlatformContext(supabase);
  if (!hasPlatformPermission(ctx.platformPermissions, permission)) {
    throw new ForbiddenError(`Missing platform permission: ${permission}`);
  }
  return ctx;
}
