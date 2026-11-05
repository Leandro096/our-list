import {
  Gift,
  Tags,
  Send,
  Users,
  Shield,
  UserCog,
  Armchair,
  ScanLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { PERMISSIONS } from '@/lib/permissions';

export type NavItem = {
  nameKey: string;
  href: string;
  icon: LucideIcon;
  /** The item shows when the user holds at least one of these. */
  permissions: string[];
  /** Extra path prefixes that also mark this item as active. */
  match?: string[];
};

// The four jobs of a wedding, plus the home page.
export const mainNav: NavItem[] = [
  {
    nameKey: 'nav.home',
    href: '/dashboard',
    icon: Sparkles,
    permissions: [PERMISSIONS.DASHBOARD_VIEW],
  },
  {
    nameKey: 'nav.guests',
    href: '/dashboard/guests',
    icon: Users,
    permissions: [PERMISSIONS.GUESTS_VIEW],
  },
  {
    nameKey: 'nav.invitations',
    href: '/dashboard/invitations',
    icon: Send,
    permissions: [PERMISSIONS.GUESTS_VIEW],
  },
  {
    nameKey: 'nav.seating',
    href: '/dashboard/seating',
    icon: Armchair,
    permissions: [PERMISSIONS.SEATING_VIEW],
  },
  {
    nameKey: 'nav.eventDay',
    href: '/dashboard/scanner',
    icon: ScanLine,
    permissions: [PERMISSIONS.SCANNER_USE, PERMISSIONS.SCANNER_HISTORY],
    match: ['/dashboard/scanner'],
  },
];

// Setup pages live in the account menu, not in the daily navigation.
export const accountNav: NavItem[] = [
  {
    nameKey: 'nav.categories',
    href: '/dashboard/categories',
    icon: Tags,
    permissions: [PERMISSIONS.CATEGORIES_VIEW],
  },
  {
    nameKey: 'nav.gifts',
    href: '/dashboard/gifts',
    icon: Gift,
    permissions: [PERMISSIONS.GUESTS_VIEW],
  },
  {
    nameKey: 'nav.users',
    href: '/dashboard/settings/users',
    icon: UserCog,
    permissions: [PERMISSIONS.SETTINGS_USERS],
  },
  {
    nameKey: 'nav.roles',
    href: '/dashboard/settings/roles',
    icon: Shield,
    permissions: [PERMISSIONS.SETTINGS_ROLES],
  },
];

export function isNavActive(item: NavItem, pathname: string) {
  if (item.href === '/dashboard') return pathname === '/dashboard';
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
