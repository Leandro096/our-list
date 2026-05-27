'use client';

import { usePathname } from 'next/navigation';
import { useRef, useState, useEffect, useContext, createContext } from 'react';

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
  const { setPageLoading } = useContext(SidebarContext);
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

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, isPageLoading, setPageLoading }}>
      <NavigationWatcher />
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
