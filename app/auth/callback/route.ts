import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import type { TenantType } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

import { createTenant } from '@/services/tenant.service';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !sessionData.user) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const user = sessionData.user;

  // Provision tenant for new users who signed up with workspace metadata.
  // Check if the user already has a tenant membership to avoid duplicates.
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('tenant_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!existing) {
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const tenantType = (meta.tenant_type as TenantType) ?? 'individual';
    const workspaceName =
      meta.workspace_name || meta.display_name || user.email?.split('@')[0] || 'My Workspace';

    try {
      // Create tenant
      const tenant = await createTenant(admin, {
        name: workspaceName,
        type: tenantType,
        ownerId: user.id,
      });

      // Find owner role
      const { data: ownerRole } = await admin
        .from('roles')
        .select('id')
        .eq('name', 'owner')
        .single();

      // Create tenant_member (owner)
      await admin.from('tenant_members').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role_id: ownerRole?.id ?? null,
        status: 'active',
      });

      // Create default event
      const eventDate = new Date();
      eventDate.setFullYear(eventDate.getFullYear() + 1);
      await admin.from('events').insert({
        tenant_id: tenant.id,
        name: workspaceName,
        event_date: eventDate.toISOString().slice(0, 10),
        status: 'active',
        created_by: user.id,
      });
    } catch {
      // Tenant provisioning failure is non-fatal — user can set up later
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
