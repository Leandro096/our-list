// Permission resolution utility with wildcard support

/**
 * Check if a user has a specific permission.
 * Supports wildcard matching (e.g. "guests.*" matches "guests.list.view").
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
  isSuperAdmin: boolean = false
): boolean {
  if (isSuperAdmin) return true;

  const permSet = new Set(userPermissions);

  if (permSet.has(requiredPermission)) return true;
  if (permSet.has('*')) return true;

  // Check nested wildcards (e.g. "guests.*" matches "guests.list.view")
  const parts = requiredPermission.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcardScope = parts.slice(0, i).join('.') + '.*';
    if (permSet.has(wildcardScope)) return true;
  }

  return false;
}

export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
  isSuperAdmin: boolean = false
): boolean {
  return requiredPermissions.some((p) => hasPermission(userPermissions, p, isSuperAdmin));
}

export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
  isSuperAdmin: boolean = false
): boolean {
  return requiredPermissions.every((p) => hasPermission(userPermissions, p, isSuperAdmin));
}

// ================================================================
// TENANT-LEVEL PERMISSION SCOPES
// Convention: module.resource.action[.subaction]
// Wildcards are supported at any depth.
// ================================================================

export const PERMISSIONS = {
  // ---- Dashboard ----
  DASHBOARD_VIEW:  'dashboard.view',
  DASHBOARD_STATS: 'dashboard.stats',
  DASHBOARD_ALL:   'dashboard.*',

  // ---- Guest list ----
  GUESTS_LIST_VIEW:    'guests.list.view',
  GUESTS_LIST_FILTERS: 'guests.list.filters',
  GUESTS_LIST_CREATE:  'guests.list.create',
  GUESTS_LIST_EXPORT:  'guests.list.export',
  GUESTS_LIST_ALL:     'guests.list.*',

  // ---- Guest detail ----
  GUESTS_DETAIL_VIEW:   'guests.detail.view',
  GUESTS_DETAIL_EDIT:   'guests.detail.edit',
  GUESTS_DETAIL_DELETE: 'guests.detail.delete',
  GUESTS_DETAIL_QR:     'guests.detail.qr',
  GUESTS_DETAIL_ALL:    'guests.detail.*',

  // Wildcard for all guest scopes
  GUESTS_ALL: 'guests.*',

  // ---- Seating ----
  SEATING_BOARD_VIEW:   'seating.board.view',
  SEATING_BOARD_ASSIGN: 'seating.board.assign',
  SEATING_TABLES_CREATE: 'seating.tables.create',
  SEATING_ALL:           'seating.*',

  // ---- Scanner ----
  SCANNER_SCAN_USE:     'scanner.scan.use',
  SCANNER_HISTORY_VIEW: 'scanner.history.view',
  SCANNER_ALL:          'scanner.*',

  // ---- Categories ----
  CATEGORIES_MANAGE_CREATE: 'categories.manage.create',
  CATEGORIES_MANAGE_EDIT:   'categories.manage.edit',
  CATEGORIES_MANAGE_DELETE: 'categories.manage.delete',
  CATEGORIES_ALL:            'categories.*',

  // ---- Statuses ----
  STATUSES_MANAGE_CREATE: 'statuses.manage.create',
  STATUSES_MANAGE_EDIT:   'statuses.manage.edit',
  STATUSES_MANAGE_DELETE: 'statuses.manage.delete',
  STATUSES_ALL:            'statuses.*',

  // ---- Event Sessions ----
  SESSIONS_MANAGE_CREATE: 'sessions.manage.create',
  SESSIONS_MANAGE_EDIT:   'sessions.manage.edit',
  SESSIONS_MANAGE_DELETE: 'sessions.manage.delete',
  SESSIONS_ALL:            'sessions.*',

  // ---- Events / projects ----
  EVENTS_CREATE:         'events.create',
  EVENTS_EDIT_DATE:      'events.edit.date',
  EVENTS_MEMBERS_ASSIGN: 'events.members.assign',
  EVENTS_ALL:            'events.*',

  // ---- Settings ----
  SETTINGS_MEMBERS_INVITE:       'settings.members.invite',
  SETTINGS_ROLES_EDIT:           'settings.roles.edit',
  SETTINGS_BILLING_VIEW:         'settings.billing.view',
  SETTINGS_BILLING_SUBMIT_PROOF: 'settings.billing.submit_proof',
  SETTINGS_ALL:                  'settings.*',

  // ---- Legacy aliases (kept for backward compat; map to new scopes) ----
  /** @deprecated use GUESTS_LIST_VIEW */
  GUESTS_VIEW:    'guests.list.view',
  /** @deprecated use GUESTS_LIST_CREATE */
  GUESTS_CREATE:  'guests.list.create',
  /** @deprecated use GUESTS_DETAIL_EDIT */
  GUESTS_EDIT:    'guests.detail.edit',
  /** @deprecated use GUESTS_DETAIL_DELETE */
  GUESTS_DELETE:  'guests.detail.delete',
  /** @deprecated use GUESTS_LIST_EXPORT */
  GUESTS_EXPORT:  'guests.list.export',
  /** @deprecated use GUESTS_DETAIL_QR */
  GUESTS_QR:      'guests.detail.qr',
  /** @deprecated use SCANNER_SCAN_USE */
  SCANNER_USE:     'scanner.scan.use',
  /** @deprecated use SCANNER_HISTORY_VIEW */
  SCANNER_HISTORY: 'scanner.history.view',
  /** @deprecated use SEATING_BOARD_VIEW */
  SEATING_VIEW:    'seating.board.view',
  /** @deprecated use SEATING_BOARD_ASSIGN */
  SEATING_EDIT:    'seating.board.assign',
  /** @deprecated use CATEGORIES_ALL */
  CATEGORIES_VIEW:   'categories.*',
  CATEGORIES_MANAGE: 'categories.*',
  /** @deprecated use SETTINGS_ALL */
  SETTINGS_USERS:       'settings.*',
  SETTINGS_ROLES:       'settings.roles.edit',
  SETTINGS_PERMISSIONS: 'settings.*',

  // Global wildcard
  ALL: '*',
} as const;

export type PermissionScope = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ================================================================
// PLATFORM-LEVEL PERMISSION SCOPES
// These live in public.platform_permissions — separate from tenant scopes.
// Checked via has_platform_permission() SQL function or getPlatformContext().
// ================================================================

export const PLATFORM_PERMISSIONS = {
  TENANTS_VIEW:    'platform.tenants.view',
  TENANTS_MANAGE:  'platform.tenants.manage',
  PLANS_MANAGE:    'platform.plans.manage',
  FEATURES_MANAGE: 'platform.features.manage',
  BILLING_VIEW:    'platform.billing.view',
  BILLING_CONFIRM: 'platform.billing.confirm',
  BILLING_REJECT:  'platform.billing.reject',
  GLOBALS_MANAGE:  'platform.globals.manage',
  ROLES_MANAGE:    'platform.roles.manage',
  USERS_MANAGE:    'platform.users.manage',
  ALL:             'platform.*',
} as const;

export type PlatformPermissionScope =
  (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

/**
 * Check if a platform user has a specific platform permission scope.
 * Uses the same wildcard logic as the tenant-level hasPermission.
 */
export function hasPlatformPermission(
  platformPermissions: string[],
  requiredScope: string
): boolean {
  return hasPermission(platformPermissions, requiredScope, false);
}
