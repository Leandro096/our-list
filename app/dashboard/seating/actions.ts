'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { assertEventEditable } from '@/lib/limits';
import { createClient } from '@/lib/supabase/server';
import { requireTenantPermission } from '@/lib/server-auth';

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
  input: Omit<CreateTableInput, 'created_by' | 'event_id'>
): Promise<Table> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.SEATING_EDIT);
  await assertEventEditable(supabase, ctx.eventId);
  const result = await createTable(supabase, {
    ...input,
    created_by: ctx.userId,
    event_id: ctx.eventId,
  });
  revalidatePath('/dashboard/seating');
  return result;
}

export async function deleteTableAction(tableId: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.SEATING_EDIT);
  await assertEventEditable(supabase, ctx.eventId);
  await deleteTable(supabase, tableId);
  revalidatePath('/dashboard/seating');
}

export async function updateTableAction(tableId: string, input: UpdateTableInput): Promise<Table> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.SEATING_EDIT);
  await assertEventEditable(supabase, ctx.eventId);
  const result = await updateTable(supabase, tableId, input);
  revalidatePath('/dashboard/seating');
  return result;
}

export async function assignSeatWithFamilyAction(
  input: AssignSeatInput
): Promise<AssignSeatFamilyResult> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.SEATING_EDIT);
  await assertEventEditable(supabase, ctx.eventId);
  const result = await assignSeatWithFamily(supabase, input);
  revalidatePath('/dashboard/seating');
  return result;
}

export async function removeSeatAssignmentWithFamilyAction(guestId: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await requireTenantPermission(supabase, PERMISSIONS.SEATING_EDIT);
  await assertEventEditable(supabase, ctx.eventId);
  await removeSeatAssignmentWithFamily(supabase, guestId);
  revalidatePath('/dashboard/seating');
}
