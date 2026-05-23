"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib";

// ---- Inner content (needs Suspense for useSearchParams) --------------------

function SelectRoleContent() {
  const { isLoading, profile, activeRole, selectRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [selecting, setSelecting] = useState<string | null>(null);

  // If role is already resolved (single-role auto-select or valid stored role),
  // skip the selector and go straight to the destination.
  useEffect(() => {
    if (!isLoading && activeRole) {
      router.replace(next);
    }
  }, [isLoading, activeRole, router, next]);

  const roles: Role[] = (profile?.roles as Role[]) ?? [];

  const handleSelect = async (role: Role) => {
    if (selecting) return;
    setSelecting(role.id);
    try {
      await selectRole(role);
      router.replace(next);
    } finally {
      setSelecting(null);
    }
  };

  if (isLoading || (activeRole && !selecting)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              You have access to multiple roles. Choose how you want to continue.
            </p>
          </div>
        </div>

        {/* Role cards */}
        <div className="grid gap-3">
          {roles.map((role) => {
            const isSelecting = selecting === role.id;
            return (
              <button
                key={role.id}
                onClick={() => handleSelect(role)}
                disabled={selecting !== null}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all",
                  "hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                  {isSelecting ? (
                    <Spinner className="size-5 text-primary" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {role.name}
                  </p>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can switch roles at any time from your profile menu.
        </p>
      </div>
    </div>
  );
}

// ---- Suspense wrapper (exported for use by the server page) ----------------

export default function SelectRoleClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <SelectRoleContent />
    </Suspense>
  );
}
