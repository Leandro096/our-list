'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

import { useAuth } from '@/components/auth-provider';

import { useTranslation } from '@/locales/i18n-provider';

const TABS = [
  { href: '/dashboard/scanner', labelKey: 'nav.scanner', permission: PERMISSIONS.SCANNER_USE },
  {
    href: '/dashboard/scanner/history',
    labelKey: 'nav.history',
    permission: PERMISSIONS.SCANNER_HISTORY,
  },
];

/** Scanner and its history are one section: the day of the event. */
export function EventDayTabs() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { profile, activePermissions } = useAuth();
  const isSuperAdmin = profile?.is_super_admin || false;
  const tabs = TABS.filter((tab) => hasPermission(activePermissions, tab.permission, isSuperAdmin));

  if (tabs.length < 2) return null;

  return (
    <nav aria-label={t('nav.eventDay')} className="flex gap-5 border-b border-border">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 border-transparent px-0.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              active
                ? 'border-gold font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
