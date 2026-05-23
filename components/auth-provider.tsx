"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { UserWithRoles, Role } from "@/lib";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

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

function persistActiveRole(
  userId: string,
  role: Role,
  permissions: string[],
): void {
  localStorage.setItem(storageKey.role(userId), JSON.stringify(role));
  localStorage.setItem(
    storageKey.permissions(userId),
    JSON.stringify(permissions),
  );
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserWithRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const supabase = createClient();

  // ---- Internal: fetch permissions for a specific role from DB  ----------
  const fetchPermissionsForRole = useCallback(
    async (roleId: string): Promise<string[]> => {
      const { data } = await supabase
        .from("role_permissions")
        .select("permissions(scope)")
        .eq("role_id", roleId);

      return (data ?? [])
        .flatMap(
          (rp: { permissions: { scope: string }[] | { scope: string } | null }) => {
            if (!rp.permissions) return [];
            return Array.isArray(rp.permissions)
              ? rp.permissions.map((p) => p.scope)
              : [rp.permissions.scope];
          },
        )
        .filter((scope): scope is string => Boolean(scope));
    },
    [supabase],
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
        const permissions = await fetchPermissionsForRole(role.id);
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

        // Re-fetch fresh permissions from DB to keep the cache up-to-date
        const fresh = await fetchPermissionsForRole(stored.id);
        setActivePermissions(fresh);
        persistActiveRole(userId, stored, fresh);
      } else {
        // No valid stored role — user must choose one via the selector
        clearActiveRoleStorage(userId);
        setActiveRole(null);
        setActivePermissions([]);
      }
    },
    [fetchPermissionsForRole],
  );

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("users")
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
        `,
        )
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.error("Error fetching user profile:", error);
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
          .map(({ id, name, description }) => ({ id, name, description })) ??
        [];

      const permissions = [
        ...new Set(
          (data.user_roles as Array<{ roles: RoleRow | null }>)
            ?.flatMap((ur) => ur.roles?.role_permissions ?? [])
            .map((rp) => rp.permissions?.scope)
            .filter((scope): scope is string => Boolean(scope)) ?? [],
        ),
      ];

      const { user_roles: _omit, ...userData } = data;

      return { ...userData, roles, permissions } as UserWithRoles;
    },
    [supabase],
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
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          if (profileData?.roles) {
            await resolveActiveRole(session.user.id, profileData.roles as Role[]);
          }
        }
      } catch (err) {
        console.error("[AuthProvider] getInitialSession error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          if (profileData?.roles) {
            await resolveActiveRole(
              session.user.id,
              profileData.roles as Role[],
            );
          }
        } else {
          setProfile(null);
          setActiveRole(null);
          setActivePermissions([]);
        }
      } catch (err) {
        console.error("[AuthProvider] onAuthStateChange error:", err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, resolveActiveRole]);

  // ---- Public: select an active role  ------------------------------------
  const selectRole = useCallback(
    async (role: Role) => {
      if (!user) return;
      const permissions = await fetchPermissionsForRole(role.id);
      persistActiveRole(user.id, role, permissions);
      setActiveRole(role);
      setActivePermissions(permissions);
    },
    [user, fetchPermissionsForRole],
  );

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      if (user) clearActiveRoleStorage(user.id);
      setUser(null);
      setProfile(null);
      setActiveRole(null);
      setActivePermissions([]);
    }
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
