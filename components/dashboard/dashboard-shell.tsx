'use client';

import { cn } from '@/lib/utils';

import { useVisibilityRefresh } from '@/hooks';

import { useSidebar, SidebarProvider } from './sidebar-context';

function ShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed, isPageLoading } = useSidebar();
  return (
    <div
      className={cn(
        'relative flex flex-1 flex-col transition-all duration-300',
        collapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}
    >
      {isPageLoading && (
        <div className={cn(
          'pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-[2px]',
          collapsed ? 'lg:left-16' : 'lg:left-64'
        )}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {children}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  useVisibilityRefresh();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        {children}
      </div>
    </SidebarProvider>
  );
}

export { ShellInner };
