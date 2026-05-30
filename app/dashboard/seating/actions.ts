'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { ForbiddenError, requirePermission, UnauthorizedError } from '@/lib/server-auth';

import type { Table } from '@/lib';
import type {
  AssignSeatInput,
  CreateTableInput,
  UpdateTableInput,
  AssignSeatFamilyResult,
} from '@/services';
import {
  createTable,
  deleteTable,
  updateTable,
  assignSeatWithFamily,
  removeSeatAssignmentWithFamily,
} from '@/services';

async function requireSeatingEdit() {
  const supabase = await createClient();
  try {
    await requirePermission(supabase, PERMISSIONS.SEATING_EDIT);
  } catch (err) {
    throw err instanceof UnauthorizedError
      ? new Error('No autenticado.')
      : err instanceof ForbiddenError
        ? new Error('Sin permiso para editar la disposición de mesas.')
        : err;
  }
  return supabase;
}

export async function createTableAction(
  input: Omit<CreateTableInput, 'created_by'>
): Promise<Table> {
  const supabase = await requireSeatingEdit();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await createTable(supabase, { ...input, created_by: user?.id ?? null });
  revalidatePath('/dashboard/seating');
  return result;
}

export async function deleteTableAction(tableId: string): Promise<void> {
  const supabase = await requireSeatingEdit();
  await deleteTable(supabase, tableId);
  revalidatePath('/dashboard/seating');
}

export async function updateTableAction(tableId: string, input: UpdateTableInput): Promise<Table> {
  const supabase = await requireSeatingEdit();
  const result = await updateTable(supabase, tableId, input);
  revalidatePath('/dashboard/seating');
  return result;
}

export async function assignSeatWithFamilyAction(
  input: AssignSeatInput
): Promise<AssignSeatFamilyResult> {
  const supabase = await requireSeatingEdit();
  const result = await assignSeatWithFamily(supabase, input);
  revalidatePath('/dashboard/seating');
  return result;
}

export async function removeSeatAssignmentWithFamilyAction(guestId: string): Promise<void> {
  const supabase = await requireSeatingEdit();
  await removeSeatAssignmentWithFamily(supabase, guestId);
  revalidatePath('/dashboard/seating');
}
