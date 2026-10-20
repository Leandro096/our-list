'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { requireAuth } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';

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

export async function createTableAction(
  input: Omit<CreateTableInput, 'created_by'>
): Promise<Table> {
  const supabase = await createClient();
  const { userId } = await requireAuth(supabase, PERMISSIONS.SEATING_EDIT);
  const result = await createTable(supabase, { ...input, created_by: userId });
  revalidatePath('/dashboard/seating');
  return result;
}

export async function deleteTableAction(tableId: string): Promise<void> {
  const supabase = await createClient();
  await requireAuth(supabase, PERMISSIONS.SEATING_EDIT);
  await deleteTable(supabase, tableId);
  revalidatePath('/dashboard/seating');
}

export async function updateTableAction(tableId: string, input: UpdateTableInput): Promise<Table> {
  const supabase = await createClient();
  await requireAuth(supabase, PERMISSIONS.SEATING_EDIT);
  const result = await updateTable(supabase, tableId, input);
  revalidatePath('/dashboard/seating');
  return result;
}

export async function assignSeatWithFamilyAction(
  input: AssignSeatInput
): Promise<AssignSeatFamilyResult> {
  const supabase = await createClient();
  await requireAuth(supabase, PERMISSIONS.SEATING_EDIT);
  const result = await assignSeatWithFamily(supabase, input);
  revalidatePath('/dashboard/seating');
  return result;
}

export async function removeSeatAssignmentWithFamilyAction(guestId: string): Promise<void> {
  const supabase = await createClient();
  await requireAuth(supabase, PERMISSIONS.SEATING_EDIT);
  await removeSeatAssignmentWithFamily(supabase, guestId);
  revalidatePath('/dashboard/seating');
}
