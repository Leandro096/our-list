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
      // Fetch user profile with roles and permissions
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        console.error("Error fetching user profile:", userError);
        return null;
      }

      // Fetch user roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select(
          `
        role_id,
        roles (
          id,
          name,
          description
        )
      `,
        )
        .eq("user_id", userId);

      // Fetch permissions for each role
      const roleIds = userRoles?.map((ur) => ur.role_id) || [];
      const { data: rolePermissions } = await supabase
        .from("role_permissions")
        .select(
          `
        permission_id,
        permissions (
          id,
          scope,
          description
        )
      `,
        )
        .in("role_id", roleIds);

      // Extract unique permission scopes
      const permissions = [
        ...new Set(
          rolePermissions
            ?.map((rp) => (rp.permissions as { scope: string })?.scope)
            .filter(Boolean) || [],
        ),
      ];

      // Extract roles
      const roles =
        userRoles
          ?.map(
            (ur) =>
              ur.roles as {
                id: string;
                name: string;
                description: string | null;
              },
          )
          .filter(Boolean) || [];

      return {
        ...userData,
        roles,
        permissions,
      } as UserWithRoles;
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
