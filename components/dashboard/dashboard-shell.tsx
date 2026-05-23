'use client';

import { cn } from '@/lib/utils';
import { SidebarProvider, useSidebar } from './sidebar-context';

function ShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        'flex flex-1 flex-col transition-all duration-300',
        collapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}
    >
      {children}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        {children}
      </div>
    </SidebarProvider>
  );
}

export { ShellInner };
