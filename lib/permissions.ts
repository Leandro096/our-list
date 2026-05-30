// Permission resolution utility with wildcard support

/**
 * Check if a user has a specific permission
 * Supports wildcard matching (e.g., "guests.*" matches "guests.view")
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
  isSuperAdmin: boolean = false
): boolean {
  // Super admins have all permissions
  if (isSuperAdmin) return true;

  // Check for exact match first
  if (userPermissions.includes(requiredPermission)) return true;

  // Check for wildcard match
  // Global wildcard
  if (userPermissions.includes('*')) return true;

  // Check nested wildcards (e.g., "guests.*" matches "guests.view")
  const parts = requiredPermission.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcardScope = parts.slice(0, i).join('.') + '.*';
    if (userPermissions.includes(wildcardScope)) return true;
  }

  return false;
}

/**
 * Check if a user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
  isSuperAdmin: boolean = false
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(userPermissions, permission, isSuperAdmin)
  );
}

/**
 * Check if a user has all of the required permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
  isSuperAdmin: boolean = false
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(userPermissions, permission, isSuperAdmin)
  );
}

// Permission scope constants
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_STATS: 'dashboard.stats',

  // Guests
  GUESTS_VIEW: 'guests.view',
  GUESTS_CREATE: 'guests.create',
  GUESTS_EDIT: 'guests.edit',
  GUESTS_DELETE: 'guests.delete',
  GUESTS_EXPORT: 'guests.export',
  GUESTS_QR: 'guests.qr',
  GUESTS_ALL: 'guests.*',

  // Scanner
  SCANNER_USE: 'scanner.use',
  SCANNER_HISTORY: 'scanner.history',
  SCANNER_ALL: 'scanner.*',

  // Seating
  SEATING_VIEW: 'seating.view',
  SEATING_EDIT: 'seating.edit',
  SEATING_ALL: 'seating.*',

  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_MANAGE: 'categories.manage',

  // Settings
  SETTINGS_USERS: 'settings.users',
  SETTINGS_ROLES: 'settings.roles',
  SETTINGS_PERMISSIONS: 'settings.permissions',
  SETTINGS_ALL: 'settings.*',

  // Global
  ALL: '*',
} as const;

export type PermissionScope = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
