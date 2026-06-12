'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { validateImportRows } from '@/lib/validations/guest-import';
import type { ImportRowInput } from '@/lib/validations/guest-import';
import { mutationLimiter, heavyActionLimiter } from '@/lib/rate-limit';
import { requireAuth, requireTenantPermission, ForbiddenError, UnauthorizedError } from '@/lib/server-auth';
import { assertGuestQuota, assertEventEditable, LimitError } from '@/lib/limits';

import type { Guest } from '@/lib';
import type { CreateGuestInput, UpdateGuestInput } from '@/services';
import {
  deleteGuest,
  createGuest,
  updateGuest,
  bulkDeleteGuests,
  linkGuestToParent,
  unlinkGuestFromParent,
} from '@/services';

const MAX_IMPORT_ROWS = 1000;

export interface ImportGuestsResult {
  created: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Bulk-imports guests from a validated set of rows.
 *
 * Strategy:
 *  - Each row is inserted as a new guest (no upsert).
 *  - Categories are resolved by name (case-insensitive). If a category doesn't
 *    exist yet it is created with a default grey color.
 *  - event_attendance rows are inserted for ceremony + reception.
 *  - table_number is informational only — seating assignments are not created
 *    because they require a table record to already exist.
 */
export async function importGuestsAction(
  rawRows: Record<string, string>[]
): Promise<ImportGuestsResult> {
  const supabaseForUser = await createClient();

  let userId: string;
  let eventId: string;
  try {
    const ctx = await requireTenantPermission(supabaseForUser, PERMISSIONS.GUESTS_CREATE);
    userId = ctx.userId;
    eventId = ctx.eventId;
    await assertEventEditable(supabaseForUser, eventId);
  } catch (err) {
    const message =
      err instanceof UnauthorizedError
        ? 'No autenticado.'
        : err instanceof ForbiddenError
          ? 'No tienes permiso para importar invitados.'
          : err instanceof LimitError
            ? err.message
            : 'Error de autorización.';
    return { created: 0, errors: [{ row: 0, error: message }] };
  }

  const rateCheck = heavyActionLimiter.check(userId);
  if (!rateCheck.allowed) {
    return {
      created: 0,
      errors: [{ row: 0, error: rateCheck.message }],
    };
  }

  if (rawRows.length > MAX_IMPORT_ROWS) {
    return {
      created: 0,
      errors: [{ row: 0, error: `Max ${MAX_IMPORT_ROWS} rows per import.` }],
    };
  }

  const { valid, errors: validationErrors } = validateImportRows(rawRows);

  const result: ImportGuestsResult = {
    created: 0,
    errors: validationErrors.map((e) => ({ row: e.row, error: e.error ?? 'Validation error' })),
  };

  if (valid.length === 0) return result;

  const supabase = supabaseForUser;

  // ---- Resolve / create categories ----------------------------------------
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('event_id', eventId);

  const categoryMap = new Map<string, string>( // lowercase name → id
    (existingCategories ?? []).map((c: { id: string; name: string }) => [
      c.name.toLowerCase(),
      c.id,
    ])
  );

  /** Returns category id, creating the category if it doesn't exist yet */
  async function resolveCategoryId(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase();
    if (categoryMap.has(key)) return categoryMap.get(key)!;

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), color: '#9ca3af', description: null, event_id: eventId })
      .select('id')
      .single();

    if (error || !data) return null;
    categoryMap.set(key, data.id);
    return data.id;
  }

  // ---- Insert each guest row -----------------------------------------------
  for (const { row, data } of valid) {
    const guestFields = { ...buildGuestFields(data), event_id: eventId };

    const { data: newGuest, error: insertError } = await supabase
      .from('guests')
      .insert(guestFields)
      .select('id')
      .single();

    if (insertError || !newGuest) {
      result.errors.push({ row, error: insertError?.message ?? 'Insert failed' });
      continue;
    }

    const guestId: string = newGuest.id;

    // Categories
    if (data.categories) {
      const names = data.categories.split(',').flatMap((n) => {
        const trimmed = n.trim();
        return trimmed ? [trimmed] : [];
      });

      const categoryIds = (await Promise.all(names.map((n) => resolveCategoryId(n)))).filter(
        (id): id is string => id !== null
      );

      if (categoryIds.length > 0) {
        await supabase
          .from('guest_categories')
          .insert(categoryIds.map((category_id) => ({ guest_id: guestId, category_id })));
      }
    }

    // Attendance
    const attendanceRows = buildAttendanceRows(guestId, data);
    if (attendanceRows.length > 0) {
      await supabase.from('event_attendance').insert(attendanceRows);
    }

    result.created++;
  }

  return result;
}

// ---------------------------------------------------------------------------

function buildGuestFields(data: ImportRowInput) {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    status: data.status,
    dietary_restrictions: data.dietary_restrictions ?? null,
    notes: data.notes ?? null,
    is_plus_one: data.is_plus_one,
  };
}

function buildAttendanceRows(
  guestId: string,
  data: ImportRowInput
): Array<{ guest_id: string; event_type: string; attending: boolean }> {
  const rows = [];
  if (data.ceremony_attending !== undefined) {
    rows.push({ guest_id: guestId, event_type: 'ceremony', attending: data.ceremony_attending });
  }
  if (data.reception_attending !== undefined) {
    rows.push({ guest_id: guestId, event_type: 'reception', attending: data.reception_attending });
  }
  return rows;
}

export async function deleteGuestAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  let userId: string;
  try {
    const ctx = await requireAuth(supabase, PERMISSIONS.GUESTS_DELETE);
    userId = ctx.userId;
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : 'No tienes permiso para eliminar invitados.',
    };
  }

  const rateCheck = mutationLimiter.check(userId);
  if (!rateCheck.allowed) return { error: rateCheck.message };

  await deleteGuest(supabase, id);
  revalidatePath('/dashboard/guests');
  return {};
}

export async function bulkDeleteGuestsAction(ids: string[]): Promise<{ error?: string }> {
  const supabase = await createClient();

  let userId: string;
  try {
    const ctx = await requireAuth(supabase, PERMISSIONS.GUESTS_DELETE);
    userId = ctx.userId;
  } catch (err) {
    return {
      error:
        err instanceof UnauthorizedError
          ? 'No autenticado.'
          : 'No tienes permiso para eliminar invitados.',
    };
  }

  const rateCheck = mutationLimiter.check(userId);
  if (!rateCheck.allowed) return { error: rateCheck.message };

  await bulkDeleteGuests(supabase, ids);
  revalidatePath('/dashboard/guests');
  return {};
}

// ---- Guest mutations (create / update / family links) ----------------------
// These actions run server-side so the Supabase client is created fresh per
// request. This completely bypasses the browser singleton's refreshingPromise,
// which is the root cause of the 10-second timeout on POST/UPDATE operations
// after periods of inactivity.

export async function createGuestAction(input: CreateGuestInput): Promise<Guest> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.GUESTS_CREATE);
  await assertGuestQuota(supabase, ctx.eventId);
  await assertEventEditable(supabase, ctx.eventId);
  const result = await createGuest(supabase, { ...input, event_id: ctx.eventId });
  revalidatePath('/dashboard/guests');
  return result;
}

export async function updateGuestAction(id: string, input: UpdateGuestInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    const ctx = await requireTenantPermission(supabase, PERMISSIONS.GUESTS_EDIT);
    await assertEventEditable(supabase, ctx.eventId);
    await updateGuest(supabase, id, input);
    revalidatePath('/dashboard/guests');
    return {};
  } catch (err) {
    if (err instanceof LimitError) return { error: err.message };
    throw err;
  }
}

export async function linkGuestToParentAction(childId: string, parentId: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.GUESTS_EDIT);
  await assertEventEditable(supabase, ctx.eventId);
  await linkGuestToParent(supabase, childId, parentId);
  revalidatePath('/dashboard/guests');
}

export async function unlinkGuestFromParentAction(childId: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.GUESTS_EDIT);
  await assertEventEditable(supabase, ctx.eventId);
  await unlinkGuestFromParent(supabase, childId);
  revalidatePath('/dashboard/guests');
}

export type AvailableGuest = { id: string; first_name: string; last_name: string };

export async function getAvailableGuestsAction(excludeId?: string): Promise<AvailableGuest[]> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.GUESTS_EDIT);
  let query = supabase
    .from('guests')
    .select('id, first_name, last_name')
    .is('parent_guest_id', null)
    .eq('event_id', ctx.eventId)
    .order('first_name');
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
