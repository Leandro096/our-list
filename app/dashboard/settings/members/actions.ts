'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LimitError, assertCanAddMember } from '@/lib/limits';
import { ForbiddenError, UnauthorizedError, requireTenantPermission } from '@/lib/server-auth';

import { inviteTenantMember, removeTenantMember } from '@/services/tenant.service';
import { removeEventMember, assignMemberToEvent } from '@/services/event-member.service';

const REVALIDATE_PATH = '/dashboard/settings/members';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export type MemberActionResult = { error?: string };

/**
 * Invites a user by email and adds them as a tenant member with the given role.
 * Uses the admin client to create / look up the auth user via inviteUserByEmail.
 */
export async function inviteMemberAction(
  email: string,
  roleId: string
): Promise<MemberActionResult> {
  if (!email.trim() || !roleId) return { error: 'Email y rol son requeridos.' };

  const supabase = await createClient();
  let ctx: Awaited<ReturnType<typeof requireTenantPermission>>;
  try {
    ctx = await requireTenantPermission(supabase, PERMISSIONS.SETTINGS_MEMBERS_INVITE);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso para invitar miembros.'
            : 'Error de autorización.',
    };
  }

  const admin = createAdminClient();

  // Invite via Supabase Auth (creates account if new, sends magic link if existing)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim(),
    { redirectTo: `${SITE_URL}/auth/callback` }
  );

  if (inviteError || !inviteData.user) {
    return { error: inviteError?.message ?? 'No se pudo enviar la invitación.' };
  }

  const userId = inviteData.user.id;

  // Check if already a member
  const { data: existing } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('user_id', userId)
    .single();

  if (existing) return { error: 'Este usuario ya es miembro del workspace.' };

  try {
    await assertCanAddMember(supabase, ctx.tenantId);
  } catch (err) {
    if (err instanceof LimitError) return { error: err.message };
    return { error: 'Error al verificar límite de miembros.' };
  }

  try {
    await inviteTenantMember(admin, ctx.tenantId, userId, roleId, ctx.userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo agregar el miembro.' };
  }

  revalidatePath(REVALIDATE_PATH);
  return {};
}

export async function removeMemberAction(memberId: string): Promise<MemberActionResult> {
  const supabase = await createClient();
  try {
    await requireTenantPermission(supabase, PERMISSIONS.SETTINGS_MEMBERS_INVITE);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso.'
            : 'Error de autorización.',
    };
  }

  try {
    await removeTenantMember(supabase, memberId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo eliminar el miembro.' };
  }

  revalidatePath(REVALIDATE_PATH);
  return {};
}

/**
 * Grants a tenant member visibility to the currently active event.
 * Requires the `events.members.assign` permission.
 */
export async function assignEventMemberAction(tenantMemberId: string): Promise<MemberActionResult> {
  if (!tenantMemberId) return { error: 'Miembro requerido.' };

  const supabase = await createClient();
  let ctx: Awaited<ReturnType<typeof requireTenantPermission>>;
  try {
    ctx = await requireTenantPermission(supabase, PERMISSIONS.EVENTS_MEMBERS_ASSIGN);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso para asignar miembros a eventos.'
            : 'Error de autorización.',
    };
  }

  try {
    await assignMemberToEvent(supabase, ctx.eventId, tenantMemberId, ctx.userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo asignar el miembro.' };
  }

  revalidatePath(REVALIDATE_PATH);
  return {};
}

/** Revokes a member's visibility to the active event (by event_members row id). */
export async function removeEventMemberAction(eventMemberId: string): Promise<MemberActionResult> {
  if (!eventMemberId) return { error: 'Asignación requerida.' };

  const supabase = await createClient();
  try {
    await requireTenantPermission(supabase, PERMISSIONS.EVENTS_MEMBERS_ASSIGN);
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : err instanceof ForbiddenError
            ? 'Sin permiso.'
            : 'Error de autorización.',
    };
  }

  try {
    await removeEventMember(supabase, eventMemberId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo quitar la asignación.' };
  }

  revalidatePath(REVALIDATE_PATH);
  return {};
}
