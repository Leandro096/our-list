import { AuthProvider } from "@/components/auth-provider";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell, ShellInner } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getInitialProfile } from "@/services/user.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the user AND full profile server-side so AuthProvider receives
  // both as props and never makes any Supabase calls on the client during
  // initial mount. This eliminates the Web Lock contention that caused the
  // 8-second loading spinner on page refresh.
  const supabase = await createClient();
  const {
    data: { user: initialUser },
  } = await supabase.auth.getUser();
  const initialProfile = initialUser
    ? await getInitialProfile(supabase, initialUser.id)
    : null;

  return (
    <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
      <AuthGuard>
        <DashboardShell>
          <DashboardSidebar />
          <ShellInner>
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </ShellInner>
        </DashboardShell>
      </AuthGuard>
    </AuthProvider>
  );
}
