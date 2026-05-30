'use client';

import { useState, useEffect, useContext, useCallback, createContext } from 'react';

import type { User as SupabaseUser } from '@supabase/supabase-js';

import { resetClient, createClient } from '@/lib/supabase/client';

import type { Role, UserWithRoles } from '@/lib';

// ---- localStorage helpers (user-scoped to prevent cross-user leakage) ------

const storageKey = {
  role: (uid: string) => `wl_active_role_${uid}`,
  permissions: (uid: string) => `wl_active_permissions_${uid}`,
};

function readStoredRole(userId: string): Role | null {
  try {
    const raw = localStorage.getItem(storageKey.role(userId));
    return raw ? (JSON.parse(raw) as Role) : null;
  } catch {
    return null;
  }
}

function readStoredPermissions(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey.permissions(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistActiveRole(userId: string, role: Role, permissions: string[]): void {
  localStorage.setItem(storageKey.role(userId), JSON.stringify(role));
  localStorage.setItem(storageKey.permissions(userId), JSON.stringify(permissions));
}

function clearActiveRoleStorage(userId: string): void {
  localStorage.removeItem(storageKey.role(userId));
  localStorage.removeItem(storageKey.permissions(userId));
}

// ---- Context ----------------------------------------------------------------

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserWithRoles | null;
  isLoading: boolean;
  /** The role the user is currently operating under. */
  activeRole: Role | null;
  /** Resolved permission scopes for the active role only. */
  activePermissions: string[];
  /** Selects a role, fetches its permissions from DB, and persists to localStorage. */
  selectRole: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Authenticated user pre-fetched server-side (e.g. from DashboardLayout or
   * SelectRolePage). When provided, the provider skips the client-side
   * `getUser()` call on mount, eliminating the risk of a hanging
   * `_callRefreshToken()` request (the root cause of the 8-second spinner).
   *
   * Pass `null` for unauthenticated routes. Omit (`undefined`) only when no
   * server component is in the tree (should be rare).
   */
  initialUser?: SupabaseUser | null;
  /**
   * Full user profile (with roles + embedded permissions) pre-fetched
   * server-side via `getInitialProfile()`. When provided together with
   * `initialUser`, the client skips EVERY Supabase call on mount —
   * including `fetchProfile()` and `fetchPermissionsForRole()` — completely
   * eliminating the Web Lock contention that causes the 8-second spinner.
   */
  initialProfile?: UserWithRoles | null;
}

export function AuthProvider({ children, initialUser, initialProfile }: AuthProviderProps) {
  // Seed from SSR so the user is available synchronously before any effect runs.
  const [user, setUser] = useState<SupabaseUser | null>(initialUser ?? null);
  // Seed profile from SSR to avoid ANY client-side Supabase DB query on mount.
  const [profile, setProfile] = useState<UserWithRoles | null>(initialProfile ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const supabase = createClient();

  // ---- Internal: fetch permissions for a specific role from DB  ----------
  const fetchPermissionsForRole = useCallback(
    async (roleId: string): Promise<string[]> => {
      const { data } = await supabase
        .from('role_permissions')
        .select('permissions(scope)')
        .eq('role_id', roleId);

      return (data ?? [])
        .flatMap((rp: { permissions: { scope: string }[] | { scope: string } | null }) => {
          if (!rp.permissions) return [];
          return Array.isArray(rp.permissions)
            ? rp.permissions.map((p) => p.scope)
            : [rp.permissions.scope];
        })
        .filter((scope): scope is string => Boolean(scope));
    },
    [supabase]
  );

  // ---- Internal: resolve active role after profile load ------------------
  const resolveActiveRole = useCallback(
    async (userId: string, roles: Role[]) => {
      if (roles.length === 0) {
        clearActiveRoleStorage(userId);
        setActiveRole(null);
        setActivePermissions([]);
        return;
      }

      if (roles.length === 1) {
        // Auto-select the sole role — no UI prompt needed
        const role = roles[0];
        // Use permissions embedded in the role (from SSR profile) to avoid a
        // DB round-trip. Falls back to a live query only when not available
        // (e.g. old onAuthStateChange path before fetchProfile was updated).
        const permissions = role.permissions ?? (await fetchPermissionsForRole(role.id));
        persistActiveRole(userId, role, permissions);
        setActiveRole(role);
        setActivePermissions(permissions);
        return;
      }

      // Multiple roles: restore from localStorage if still valid
      const stored = readStoredRole(userId);
      if (stored && roles.some((r) => r.id === stored.id)) {
        // Apply cached permissions immediately for a fast render (no flash)
        const cached = readStoredPermissions(userId);
        setActiveRole(stored);
        setActivePermissions(cached);

        // Use embedded permissions when available — avoids a DB query.
        const storedRoleFull = roles.find((r) => r.id === stored.id);
        const fresh = storedRoleFull?.permissions ?? (await fetchPermissionsForRole(stored.id));
        setActivePermissions(fresh);
        persistActiveRole(userId, stored, fresh);
      } else {
        // No valid stored role — user must choose one via the selector
        clearActiveRoleStorage(userId);
        setActiveRole(null);
        setActivePermissions([]);
      }
    },
    [fetchPermissionsForRole]
  );

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          *,
          user_roles!user_roles_user_id_fkey(
            roles(
              id,
              name,
              description,
              role_permissions(
                permissions(id, scope, description)
              )
            )
          )
        `
        )
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      type RoleRow = {
        id: string;
        name: string;
        description: string | null;
        role_permissions: Array<{
          permissions: {
            id: string;
            scope: string;
            description: string | null;
          } | null;
        }>;
      };

      const roles: { id: string; name: string; description: string | null }[] =
        (data.user_roles as Array<{ roles: RoleRow | null }>)
          ?.map((ur) => ur.roles)
          .filter((r): r is RoleRow => r !== null)
          .map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            // Include permissions so resolveActiveRole() can use them without
            // a separate fetchPermissionsForRole() DB call.
            permissions: role.role_permissions
              .map((rp) => rp.permissions?.scope)
              .filter((scope): scope is string => Boolean(scope)),
          })) ?? [];

      const permissions = [
        ...new Set(
          (data.user_roles as Array<{ roles: RoleRow | null }>)
            ?.flatMap((ur) => ur.roles?.role_permissions ?? [])
            .map((rp) => rp.permissions?.scope)
            .filter((scope): scope is string => Boolean(scope)) ?? []
        ),
      ];

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user_roles: _omit, ...userData } = data;

      return { ...userData, roles, permissions } as UserWithRoles;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      if (profileData?.roles) {
        await resolveActiveRole(user.id, profileData.roles as Role[]);
      }
    }
  }, [user, fetchProfile, resolveActiveRole]);

  useEffect(() => {
    // Failsafe: if profile loading hangs (slow DB), unblock the UI after 8 s.
    const failsafeTimer = setTimeout(() => {
      console.warn('[AuthProvider] Profile load timed out — forcing loading state off');
      setIsLoading(false);
    }, 8000);

    const loadData = async () => {
      try {
        // When `initialUser` is provided by the parent server component we
        // already know the auth state — skip any client-side Supabase auth call.
        // This is the key fix: it avoids `_callRefreshToken()` which can hang
        // indefinitely on Vercel (or deadlock in React Strict Mode).
        //
        // When `initialUser` is `undefined` (e.g. select-role, which has no
        // server-component wrapper), fall back to a client-side getUser() call.
        // At that point the user just logged in so the token is always fresh.
        let currentUser: SupabaseUser | null;
        if (initialUser !== undefined) {
          currentUser = initialUser; // already resolved server-side
        } else {
          const { data } = await supabase.auth.getUser();
          currentUser = data.user ?? null;
          setUser(currentUser);
        }

        if (currentUser) {
          // Use server-side profile when provided — avoids fetchProfile()'s
          // internal supabase.from() call which triggers getSession() →
          // acquires Web Lock → can hang if _callRefreshToken() is in-flight.
          const profileData =
            initialProfile !== undefined ? initialProfile : await fetchProfile(currentUser.id);
          if (profileData !== null) setProfile(profileData);
          if (profileData?.roles) {
            await resolveActiveRole(currentUser.id, profileData.roles as Role[]);
          }
        }
      } catch (err) {
        console.error('[AuthProvider] loadData error:', err);
      } finally {
        clearTimeout(failsafeTimer);
        setIsLoading(false);
      }
    };

    loadData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION is handled synchronously above (SSR user or getUser()).
      if (event === 'INITIAL_SESSION') return;

      try {
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          if (profileData?.roles) {
            await resolveActiveRole(session.user.id, profileData.roles as Role[]);
          }
        } else {
          setProfile(null);
          setActiveRole(null);
          setActivePermissions([]);
        }
      } catch (err) {
        console.error('[AuthProvider] onAuthStateChange error:', err);
      }
    });

    return () => {
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
    };
    // initialUser is intentionally excluded from deps — it's a stable SSR value
    // captured at mount. Re-running on reference change would cause double fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, fetchProfile, resolveActiveRole]);

  // ---- Public: select an active role  ------------------------------------
  const selectRole = useCallback(
    async (role: Role) => {
      if (!user) return;
      const permissions = role.permissions ?? (await fetchPermissionsForRole(role.id));
      persistActiveRole(user.id, role, permissions);
      setActiveRole(role);
      setActivePermissions(permissions);
    },
    [user, fetchPermissionsForRole]
  );

  const signOut = async () => {
    // 1. Limpiar estado local INMEDIATAMENTE (optimista) para que el router
    //    pueda redirigir sin esperar la red. Así el usuario nunca queda colgado.
    if (user) clearActiveRoleStorage(user.id);
    setUser(null);
    setProfile(null);
    setActiveRole(null);
    setActivePermissions([]);

    // 2. Descartar el singleton para que el próximo login parta de un cliente limpio.
    resetClient();

    // 3. Invalidar la sesión en el servidor en segundo plano (fire-and-forget).
    //    Si la red falla o tarda, no afecta la UX — el proxy detectará la sesión
    //    expirada en la siguiente navegación y redirigirá a /auth/login.
    supabase.auth.signOut().catch((error) => {
      console.error('[AuthProvider] signOut network error:', error);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        activeRole,
        activePermissions,
        selectRole,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
