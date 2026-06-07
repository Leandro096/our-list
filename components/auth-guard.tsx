'use client';

import { useRouter, usePathname } from 'next/navigation';
import { use, useMemo, useEffect, createContext } from 'react';

import type { User as SupabaseUser } from '@supabase/supabase-js';

import type { UserWithRoles } from '@/lib';

import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/components/auth-provider';

// ---- Context ----------------------------------------------------------------

interface AuthGuardContextType {
  /** Authenticated Supabase user — guaranteed non-null inside this guard. */
  user: SupabaseUser;
  /** Extended profile with roles and resolved permissions. */
  profile: UserWithRoles | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthGuardContext = createContext<AuthGuardContextType | undefined>(undefined);

// ---- Component --------------------------------------------------------------

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Path to redirect unauthenticated users to.
   * The current pathname is appended as `?next=<path>`.
   * @default "/auth/login"
   */
  redirectTo?: string;
}

/**
 * Protects its children from unauthenticated access.
 *
 * - Shows a centered spinner while the session is resolving.
 * - Redirects to `redirectTo?next=<currentPath>` when there is no active session.
 * - Provides `AuthGuardContext` (accessible via `useAuthGuard()`) with a
 *   non-null `user` guarantee.
 *
 * Must be rendered inside `<AuthProvider>`.
 */
export function AuthGuard({ children, redirectTo = '/auth/login' }: AuthGuardProps) {
  const { user, profile, isLoading, activeRole, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const ctxValue = useMemo(
    () => ({ user: user!, profile, signOut, refreshProfile }),
    [user, profile, signOut, refreshProfile]
  );

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace(`${redirectTo}?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Already on the selector — don't loop
    if (pathname === '/select-role') return;

    // Multiple roles with no active selection → send to role selector
    const roleCount = profile?.roles?.length ?? 0;
    if (roleCount > 1 && !activeRole) {
      router.replace(`/select-role?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, profile, activeRole, router, pathname, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    // Render nothing while the redirect is in flight.
    return null;
  }

  return <AuthGuardContext.Provider value={ctxValue}>{children}</AuthGuardContext.Provider>;
}

// ---- Hook -------------------------------------------------------------------

/**
 * Returns the authenticated context provided by `<AuthGuard>`.
 *
 * Guarantees that `user` is non-null — if the guard is bypassed this hook
 * throws, preventing accidental access to protected data.
 *
 * Must be called inside a component that is a descendant of `<AuthGuard>`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useAuthGuard(): AuthGuardContextType {
  const context = use(AuthGuardContext);
  if (context === undefined) {
    throw new Error('useAuthGuard must be used within an <AuthGuard>');
  }
  return context;
}
