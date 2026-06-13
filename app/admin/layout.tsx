import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Globe,
  Users,
  Building2,
  CreditCard,
  ListChecks,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getPlatformContext } from '@/lib/server-auth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '@/lib/permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getPlatformContext>>;
  try {
    ctx = await getPlatformContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  if (!hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.TENANTS_VIEW)) {
    redirect('/dashboard');
  }

  const navItems = [
    {
      href: '/admin/tenants',
      icon: Building2,
      label: 'Tenants',
      show: hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.TENANTS_VIEW),
    },
    {
      href: '/admin/billing',
      icon: CreditCard,
      label: 'Pagos',
      show: hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.BILLING_VIEW),
    },
    {
      href: '/admin/plans',
      icon: ListChecks,
      label: 'Planes',
      show: hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.PLANS_MANAGE),
    },
    {
      href: '/admin/globals',
      icon: Globe,
      label: 'Globales',
      show: hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.GLOBALS_MANAGE),
    },
    {
      href: '/admin/roles',
      icon: Users,
      label: 'Roles',
      show: hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.ROLES_MANAGE),
    },
  ].filter((i) => i.show);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Admin header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Admin Portal</span>
        </div>
        <nav className="flex gap-1 ml-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
