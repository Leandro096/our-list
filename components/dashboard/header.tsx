'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sun,
  User,
  Moon,
  Menu,
  Tags,
  Heart,
  Check,
  Users,
  LogOut,
  Shield,
  Monitor,
  History,
  UserCog,
  ScanLine,
  Armchair,
  Settings,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';

import { toast } from '@/hooks';
import { useI18n } from '@/locales';
import { cn, PERMISSIONS, hasPermission } from '@/lib';

import { useAuth } from '@/components/auth-provider';
import {
  Sheet,
  Button,
  Avatar,
  SheetTitle,
  SheetTrigger,
  SheetContent,
  DropdownMenu,
  AvatarFallback,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/components/ui';

import { LanguageSwitcher } from '../language-switcher';

const navigationItems = [
  {
    key: 'nav.dashboard' as const,
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    key: 'nav.guests' as const,
    href: '/dashboard/guests',
    icon: Users,
    permission: PERMISSIONS.GUESTS_VIEW,
  },
  {
    key: 'nav.scanner' as const,
    href: '/dashboard/scanner',
    icon: ScanLine,
    permission: PERMISSIONS.SCANNER_USE,
  },
  {
    key: 'nav.history' as const,
    href: '/dashboard/scanner/history',
    icon: History,
    permission: PERMISSIONS.SCANNER_HISTORY,
  },
  {
    key: 'nav.seating' as const,
    href: '/dashboard/seating',
    icon: Armchair,
    permission: PERMISSIONS.SEATING_VIEW,
  },
  {
    key: 'nav.categories' as const,
    href: '/dashboard/categories',
    icon: Tags,
    permission: PERMISSIONS.CATEGORIES_VIEW,
  },
  {
    key: 'nav.settings' as const,
    href: '/dashboard/settings',
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_USERS,
    children: [
      {
        key: 'nav.users' as const,
        href: '/dashboard/settings/users',
        icon: UserCog,
        permission: PERMISSIONS.SETTINGS_USERS,
      },
      {
        key: 'nav.roles' as const,
        href: '/dashboard/settings/roles',
        icon: Shield,
        permission: PERMISSIONS.SETTINGS_ROLES,
      },
    ],
  },
];

export function DashboardHeader() {
  const { profile, signOut, isLoading, activeRole, activePermissions, selectRole } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/dashboard/settings'));

  const userPermissions = activePermissions;
  const isSuperAdmin = profile?.is_super_admin || false;

  const filteredNavigation = navigationItems.filter((item) =>
    hasPermission(userPermissions, item.permission, isSuperAdmin)
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesión. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      router.push('/auth/login');
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60 md:px-6">
      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center gap-3 border-b border-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <SheetTitle className="font-serif text-lg font-semibold">Wedding Manager</SheetTitle>
          </div>
          <nav className="space-y-1 p-3">
            {filteredNavigation.map((item) => {
              const hasChildren = 'children' in item && !!item.children?.length;

              if (hasChildren) {
                const visibleChildren = item.children!.filter((child) =>
                  hasPermission(userPermissions, child.permission, isSuperAdmin)
                );
                if (visibleChildren.length === 0) return null;
                const isGroupActive = pathname.startsWith(item.href);

                return (
                  <div key={item.key}>
                    <button
                      onClick={() => setSettingsOpen((prev) => !prev)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isGroupActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{t(item.key)}</span>
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', settingsOpen && 'rotate-180')}
                      />
                    </button>
                    {settingsOpen && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                        {visibleChildren.map((child) => {
                          const isActive =
                            pathname === child.href || pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.key}
                              href={child.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                              )}
                            >
                              <child.icon className="h-4 w-4 shrink-0" />
                              <span>{t(child.key)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page title area - can be used for breadcrumbs */}
      <div className="flex-1" />

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            {t('common.light')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            {t('common.dark')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            {t('common.system')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">
                {isLoading ? '...' : getInitials(profile?.display_name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile?.display_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              {profile?.is_super_admin && (
                <span className="mt-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Super Admin
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
              <User className="mr-2 h-4 w-4" />
              {t('nav.profile')}
            </Link>
          </DropdownMenuItem>

          {/* Role switcher — only when the user has more than one role */}
          {(profile?.roles?.length ?? 0) > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {activeRole?.name ?? t('nav.activeRole')}
              </DropdownMenuLabel>
              {profile!.roles!.map((role) => (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className="cursor-pointer"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {role.name}
                  {activeRole?.id === role.id && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('common.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
