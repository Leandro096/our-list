'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'
import { useTranslation } from '@/locales/i18n-provider'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import {
  Heart,
  LayoutDashboard,
  Users,
  ScanLine,
  Armchair,
  Tags,
  Settings,
  ChevronLeft,
  ChevronDown,
  History,
  UserCog,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

type NavItem = {
  nameKey: string
  href: string
  icon: React.ElementType
  permission: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    nameKey: 'nav.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    nameKey: 'nav.guests',
    href: '/dashboard/guests',
    icon: Users,
    permission: PERMISSIONS.GUESTS_VIEW,
  },
  {
    nameKey: 'nav.scanner',
    href: '/dashboard/scanner',
    icon: ScanLine,
    permission: PERMISSIONS.SCANNER_USE,
  },
  {
    nameKey: 'nav.scanHistory',
    href: '/dashboard/scanner/history',
    icon: History,
    permission: PERMISSIONS.SCANNER_HISTORY,
  },
  {
    nameKey: 'nav.seating',
    href: '/dashboard/seating',
    icon: Armchair,
    permission: PERMISSIONS.SEATING_VIEW,
  },
  {
    nameKey: 'nav.categories',
    href: '/dashboard/categories',
    icon: Tags,
    permission: PERMISSIONS.CATEGORIES_VIEW,
  },
  {
    nameKey: 'nav.settings',
    href: '/dashboard/settings',
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_USERS,
    children: [
      {
        nameKey: 'nav.users',
        href: '/dashboard/settings/users',
        icon: UserCog,
        permission: PERMISSIONS.SETTINGS_USERS,
      },
      {
        nameKey: 'nav.roles',
        href: '/dashboard/settings/roles',
        icon: Shield,
        permission: PERMISSIONS.SETTINGS_ROLES,
      },
    ],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { profile, activePermissions } = useAuth()
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith('/dashboard/settings'),
  )

  const userPermissions = activePermissions
  const isSuperAdmin = profile?.is_super_admin || false

  const filteredNavigation = navigation.filter((item) =>
    hasPermission(userPermissions, item.permission, isSuperAdmin),
  )

  const renderItem = (item: NavItem) => {
    const hasChildren = !!item.children?.length
    const isSettingsGroup = hasChildren && item.href === '/dashboard/settings'

    if (isSettingsGroup) {
      const visibleChildren = item.children!.filter((child) =>
        hasPermission(userPermissions, child.permission, isSuperAdmin),
      )
      if (visibleChildren.length === 0) return null

      const isGroupActive = pathname.startsWith(item.href)

      return (
        <div key={item.nameKey}>
          {/* Group header */}
          <button
            onClick={() => {
              if (collapsed) {
                setCollapsed(false)
                setSettingsOpen(true)
              } else {
                setSettingsOpen((prev) => !prev)
              }
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isGroupActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            )}
            title={collapsed ? t(item.nameKey) : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{t(item.nameKey)}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform',
                    settingsOpen && 'rotate-180',
                  )}
                />
              </>
            )}
          </button>

          {/* Children */}
          {!collapsed && settingsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
              {visibleChildren.map((child) => {
                const isActive = pathname === child.href || pathname.startsWith(child.href)
                return (
                  <Link
                    key={child.nameKey}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    <span>{t(child.nameKey)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // Regular item
    const isActive =
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href))

    return (
      <Link
        key={item.nameKey}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        )}
        title={collapsed ? t(item.nameKey) : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{t(item.nameKey)}</span>}
      </Link>
    )
  }

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          'hidden lg:flex',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-serif text-lg font-semibold text-sidebar-foreground">
              {t('nav.weddingManager')}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {filteredNavigation.map((item) => renderItem(item))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronLeft
              className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
            />
            {!collapsed && <span>{t('nav.collapse')}</span>}
          </Button>
        </div>
      </aside>
    </>
  )
}
