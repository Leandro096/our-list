'use client';

import { usePathname } from 'next/navigation';
import { use, useRef, useMemo, useState, useEffect, createContext } from 'react';

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  isPageLoading: boolean;
  setPageLoading: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  isPageLoading: false,
  setPageLoading: () => {},
});

/** Clears isPageLoading whenever the pathname changes (navigation completed). */
function NavigationWatcher() {
  const pathname = usePathname();
  const { setPageLoading } = use(SidebarContext);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setPageLoading(false);
    }
  }, [pathname, setPageLoading]);

  return null;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isPageLoading, setPageLoading] = useState(false);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, isPageLoading, setPageLoading }),
    [collapsed, isPageLoading]
  );

  return (
    <SidebarContext.Provider value={value}>
      <NavigationWatcher />
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return use(SidebarContext);
}
