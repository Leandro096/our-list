'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Heart, LogOut, Monitor } from 'lucide-react';

import { toast } from '@/hooks';
import { useI18n } from '@/locales';

import { useAuth } from '@/components/auth-provider';
import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui';

import { LanguageSwitcher } from '../language-switcher';

/**
 * Minimal header for the billing-locked state — deliberately has no nav
 * links to other /dashboard/* routes. The full DashboardHeader's sidebar
 * links would still get prefetched by Next.js while visible, which re-hits
 * the billing-gate redirect on every render and looks like a network loop.
 */
export function BillingLockedHeader() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { t } = useI18n();

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
      <div className="flex flex-1 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <span className="font-serif text-lg font-semibold">Wedding Manager</span>
      </div>

      <LanguageSwitcher />

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

      <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        {t('common.signOut')}
      </Button>
    </header>
  );
}
