"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User, UserWithRoles } from "@/lib/types";

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserWithRoles | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserWithRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("users")
        .select(`
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
        `)
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
          permissions: { id: string; scope: string; description: string | null } | null;
        }>;
      };

      const roles: { id: string; name: string; description: string | null }[] =
        (data.user_roles as Array<{ roles: RoleRow | null }>)
          ?.map((ur) => ur.roles)
          .filter((r): r is RoleRow => r !== null)
          .map(({ id, name, description }) => ({ id, name, description })) ?? [];

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
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }

      setIsLoading(false);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, isLoading, signOut, refreshProfile }}
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
