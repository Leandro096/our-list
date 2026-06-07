'use client';

import { use, useMemo, createContext } from 'react';

import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions';

import { useAuth } from '@/components/auth-provider';
import { UnauthorizedPage } from '@/components/unauthorized-page';

// ---- Types ------------------------------------------------------------------

export interface PermissionContextType {
  /** Flat list of resolved permission scopes for the current user. */
  permissions: string[];
  /** True when the user has the `is_super_admin` flag (bypasses all checks). */
  isSuperAdmin: boolean;
  /** Returns true when the user holds `permission` (supports wildcards). */
  can: (permission: string) => boolean;
  /** Returns true when the user holds **at least one** of `permissions`. */
  canAny: (permissions: string[]) => boolean;
  /** Returns true when the user holds **all** of `permissions`. */
  canAll: (permissions: string[]) => boolean;
}

// ---- Context ----------------------------------------------------------------

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// ---- Global hook ------------------------------------------------------------

/**
 * Returns permission helpers derived from the current user's profile.
 *
 * Available **anywhere** inside `<AuthProvider>` — no need to be wrapped by
 * `<PermissionGuard>`.
 *
 * ```tsx
 * const { can, canAny, isSuperAdmin } = usePermissions();
 * if (can("guests.edit")) { ... }
 * ```
 */
export function usePermissions(): PermissionContextType {
  // Fall back to building the helpers directly from AuthContext so the hook
  // works globally inside <AuthProvider> without requiring a wrapping guard.
  const { profile, activePermissions } = useAuth();

  // First, try to read from a parent PermissionGuard's context (fastest path).
  const guardContext = use(PermissionContext);
  if (guardContext !== undefined) return guardContext;

  const isSuperAdmin = profile?.is_super_admin ?? false;

  return {
    permissions: activePermissions,
    isSuperAdmin,
    can: (permission: string) => hasPermission(activePermissions, permission, isSuperAdmin),
    canAny: (perms: string[]) => hasAnyPermission(activePermissions, perms, isSuperAdmin),
    canAll: (perms: string[]) => hasAllPermissions(activePermissions, perms, isSuperAdmin),
  };
}

// ---- Component --------------------------------------------------------------

interface PermissionGuardProps {
  children: React.ReactNode;
  /**
   * Shorthand for requiring a **single** permission scope.
   * Equivalent to `anyPermission="scope"`.
   */
  permission?: string;
  /**
   * The user must hold **at least one** of these permissions.
   * Accepts a single scope string or an array.
   */
  anyPermission?: string | string[];
  /**
   * The user must hold **all** of these permissions.
   * Accepts a single scope string or an array.
   */
  allPermission?: string | string[];
  /**
   * Custom element rendered when access is denied.
   * Defaults to `<UnauthorizedPage />`.
   */
  fallback?: React.ReactNode;
}

/**
 * Gates its children based on the current user's permissions.
 *
 * - Super-admins always pass through.
 * - Use `anyPermission` to require *at least one* matching scope.
 * - Use `allPermission` to require *every* listed scope.
 * - Both props can be combined; both conditions must be met simultaneously.
 * - Renders `fallback` (default: `<UnauthorizedPage />`) when access is denied.
 * - Provides `PermissionContext`, consumed via `usePermissions()`.
 *
 * Must be rendered inside `<AuthProvider>`.
 *
 * @example
 * // Require a single permission (shorthand)
 * <PermissionGuard permission="guests.view">
 *   <GuestList />
 * </PermissionGuard>
 *
 * @example
 * // Require any one of two permissions
 * <PermissionGuard anyPermission={["guests.view", "guests.*"]}>
 *   <GuestList />
 * </PermissionGuard>
 *
 * @example
 * // Require all listed permissions
 * <PermissionGuard allPermission={["settings.roles", "settings.permissions"]}>
 *   <RolesManager />
 * </PermissionGuard>
 *
 * @example
 * // Custom fallback
 * <PermissionGuard anyPermission="scanner.use" fallback={<p>No access</p>}>
 *   <Scanner />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  anyPermission,
  allPermission,
  fallback,
}: PermissionGuardProps) {
  const { profile, activePermissions } = useAuth();

  const isSuperAdmin = profile?.is_super_admin ?? false;
  const permissions = activePermissions;

  const contextValue = useMemo<PermissionContextType>(
    () => ({
      permissions,
      isSuperAdmin,
      can: (givenPermission: string) => hasPermission(permissions, givenPermission, isSuperAdmin),
      canAny: (perms: string[]) => hasAnyPermission(permissions, perms, isSuperAdmin),
      canAll: (perms: string[]) => hasAllPermissions(permissions, perms, isSuperAdmin),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions.join(','), isSuperAdmin]
  );

  const hasAccess = useMemo(() => {
    if (isSuperAdmin) return true;

    // `permission` is a shorthand for a single anyPermission check.
    const anyPerms = permission
      ? [permission]
      : anyPermission
        ? Array.isArray(anyPermission)
          ? anyPermission
          : [anyPermission]
        : null;

    const allPerms = allPermission
      ? Array.isArray(allPermission)
        ? allPermission
        : [allPermission]
      : null;

    if (anyPerms && !hasAnyPermission(permissions, anyPerms, isSuperAdmin)) return false;
    if (allPerms && !hasAllPermissions(permissions, allPerms, isSuperAdmin)) return false;

    return true;
  }, [permissions, isSuperAdmin, permission, anyPermission, allPermission]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {hasAccess ? children : (fallback ?? <UnauthorizedPage />)}
    </PermissionContext.Provider>
  );
}
