import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { readActiveSelection, readRequestPathname } from '@/lib/active-context';
import { ensureTenantEvent, userHasActiveMembership } from '@/lib/provision-tenant';

import { getInitialProfile } from '@/services/user.service';
import { tenantHasActiveSubscription } from '@/services/billing.service';

// Path where a tenant completes/pays for its plan. Always reachable so the
// billing gate below never loops on itself.
const BILLING_PATH = '/dashboard/settings/billing';

// Billing enforcement is on by default. Set BILLING_BYPASS=true in .env to skip
// the "active subscription required" gate (useful in local dev / testing).
const BILLING_BYPASS = process.env.BILLING_BYPASS === 'true';

import { AuthGuard } from '@/components/auth-guard';
import { AuthProvider } from '@/components/auth-provider';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { BillingLockedHeader } from '@/components/dashboard/billing-locked-header';
import { ShellInner, DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ContextSwitcher, type ContextOption } from '@/components/dashboard/context-switcher';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Resolve the user AND full profile server-side so AuthProvider receives
  // both as props and never makes any Supabase calls on the client during
  // initial mount. This eliminates the Web Lock contention that caused the
  // 8-second loading spinner on page refresh.
  const supabase = await createClient();
  const {
    data: { user: initialUser },
  } = await supabase.auth.getUser();

  // A user without an active workspace must complete onboarding first (create
  // a tenant + pick a plan). This replaces the old implicit provisioning so
  // workspace creation is explicit, synchronous, and never silently delayed.
  if (initialUser && !(await userHasActiveMembership(supabase, initialUser.id))) {
    redirect('/onboarding');
  }

  const selection = await readActiveSelection();
  const initialProfile = initialUser
    ? await getInitialProfile(supabase, initialUser.id, selection)
    : null;

  const activeTenantId = initialProfile?.active_tenant_id ?? null;
  let activeEventId = initialProfile?.active_event_id ?? null;

  // Repair safety-net: a tenant with a membership but no event would crash
  // getActiveContext. Create a default event, then re-resolve.
  if (initialUser && activeTenantId && !activeEventId) {
    await ensureTenantEvent(activeTenantId, initialUser.id);
    const { data: ev } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', activeTenantId)
      .eq('status', 'active')
      .order('created_at')
      .limit(1)
      .maybeSingle();
    activeEventId = (ev as { id: string } | null)?.id ?? null;
  }

  // Billing gate: block the dashboard until the tenant has an ACTIVE
  // subscription (i.e. payment confirmed). The billing page itself stays
  // reachable so the user can pay. Skipped entirely when BILLING_BYPASS=true.
  let billingLocked = false;
  if (!BILLING_BYPASS && activeTenantId) {
    const hasActiveSub = await tenantHasActiveSubscription(supabase, activeTenantId);
    if (!hasActiveSub) {
      const pathname = await readRequestPathname();
      // Fail open if the pathname header is missing, so the gate can never
      // loop on the billing page itself.
      const onBillingPage = !pathname || pathname.startsWith(BILLING_PATH);
      if (!onBillingPage) {
        redirect(BILLING_PATH);
      }
      billingLocked = true;
    }
  }

  // While locked, skip the sidebar/full nav entirely instead of just
  // redirecting non-billing routes — the sidebar's <Link>s get prefetched by
  // Next.js while visible, and each prefetch re-hits this same gate, which
  // looked like a request "loop" in devtools.
  if (billingLocked) {
    return (
      <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
        <AuthGuard>
          <div className="flex min-h-screen flex-col bg-background">
            <BillingLockedHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </div>
        </AuthGuard>
      </AuthProvider>
    );
  }

  // Workspaces the user belongs to, and the events visible (RLS) in the active
  // tenant — used by the header context switcher.
  let tenants: ContextOption[] = [];
  let events: ContextOption[] = [];
  if (initialUser) {
    const { data: memberships } = await supabase
      .from('tenant_members')
      .select('tenants(id, name)')
      .eq('user_id', initialUser.id)
      .eq('status', 'active')
      .order('created_at');
    tenants =
      (memberships as unknown as Array<{ tenants: ContextOption | ContextOption[] | null }> | null)
        ?.flatMap((m) => {
          const t = m.tenants;
          if (!t) return [];
          return Array.isArray(t) ? t : [t];
        }) ?? [];

    if (activeTenantId) {
      const { data: eventRows } = await supabase
        .from('events')
        .select('id, name')
        .eq('tenant_id', activeTenantId)
        .eq('status', 'active')
        .order('created_at');
      events = (eventRows as ContextOption[] | null) ?? [];
    }
  }

  return (
    <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
      <AuthGuard>
        <DashboardShell>
          <DashboardSidebar />
          <ShellInner>
            <DashboardHeader
              contextSwitcher={
                <ContextSwitcher
                  tenants={tenants}
                  events={events}
                  activeTenantId={activeTenantId}
                  activeEventId={activeEventId}
                />
              }
            />
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </ShellInner>
        </DashboardShell>
      </AuthGuard>
    </AuthProvider>
  );
}
