'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';

import { useTranslation } from '@/locales/i18n-provider';

import { useSidebar } from './sidebar-context';
import { mainNav, isNavActive } from './nav-config';

// Active state = a short gold thread on the left edge plus a paper-toned fill.
export function navItemClass(active: boolean) {
  return cn(
    'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
    'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary before:transition-opacity',
    'focus-visible:outline-2 focus-visible:outline-sidebar-ring',
    active
      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground before:opacity-100'
      : 'text-sidebar-foreground/70 before:opacity-0 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { profile, activePermissions } = useAuth();
  const { t } = useTranslation();
  const { collapsed, setCollapsed, setPageLoading } = useSidebar();

  const isSuperAdmin = profile?.is_super_admin || false;
  const items = mainNav.filter((item) =>
    item.permissions.some((p) => hasPermission(activePermissions, p, isSuperAdmin))
  );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4"
        onClick={() => pathname !== '/dashboard' && setPageLoading(true)}
      >
        <Image
          src="/icon.png"
          alt="GL Logo"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full ring-1 ring-sidebar-border"
          priority
        />
        {!collapsed && (
          <span className="overflow-hidden text-ellipsis whitespace-nowrap font-serif text-xl text-sidebar-foreground">
            {t('nav.weddingManager')}
          </span>
        )}
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <Link
              key={item.nameKey}
              href={item.href}
              onClick={() => {
                if (!active) setPageLoading(true);
              }}
              aria-current={active ? 'page' : undefined}
              className={navItemClass(active)}
              title={collapsed ? t(item.nameKey) : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {t(item.nameKey)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>{t('nav.collapse')}</span>}
        </Button>
      </div>
    </aside>
  );
}
