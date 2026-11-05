'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';
import { Sun, User, Moon, Menu, Heart, Check, LogOut, Shield, Monitor } from 'lucide-react';

import { toast } from '@/hooks';
import { useI18n } from '@/locales';
import { cn, hasPermission } from '@/lib';

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

import { useSidebar } from './sidebar-context';
import { LanguageSwitcher } from '../language-switcher';
import { mainNav, accountNav, isNavActive } from './nav-config';

function getInitials(name: string | null | undefined) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardHeader() {
  const { profile, signOut, isLoading, activeRole, activePermissions, selectRole } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setPageLoading } = useSidebar();

  const userPermissions = activePermissions;
  const isSuperAdmin = profile?.is_super_admin || false;

  const canSee = (item: { permissions: string[] }) =>
    item.permissions.some((p) => hasPermission(userPermissions, p, isSuperAdmin));
  const filteredNavigation = mainNav.filter(canSee);
  const visibleAccountNav = accountNav.filter(canSee);

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/70 bg-background/90 px-4 backdrop-blur md:px-8">
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <Heart className="h-4 w-4 text-gold" />
            </div>
            <SheetTitle className="font-serif text-xl">Wedding Manager</SheetTitle>
          </div>
          <nav className="space-y-1 p-3">
            {filteredNavigation.map((item) => {
              const isActive = isNavActive(item, pathname);
              return (
                <Link
                  key={item.nameKey}
                  href={item.href}
                  onClick={() => {
                    if (!isActive) setPageLoading(true);
                    setMobileOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{t(item.nameKey)}</span>
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
              <AvatarFallback className="bg-secondary font-serif text-sm text-secondary-foreground">
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
                <span className="mt-1 inline-flex w-fit items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
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
          {visibleAccountNav.map((item) => (
            <DropdownMenuItem key={item.nameKey} asChild>
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {t(item.nameKey)}
              </Link>
            </DropdownMenuItem>
          ))}

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
