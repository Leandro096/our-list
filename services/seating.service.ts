/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Guest, Table, SeatingAssignment } from '@/lib/types';

// ---- Return types ----

export type SeatingGuest = Pick<Guest, 'id' | 'first_name' | 'last_name' | 'status'> & {
  seating_assignments: Array<Pick<SeatingAssignment, 'id' | 'table_id'>>;
};

export type SeatingAssignmentWithGuest = SeatingAssignment & {
  guests: Pick<Guest, 'id' | 'first_name' | 'last_name'>;
  tables: Pick<Table, 'id' | 'name' | 'number'>;
};

export type SeatingData = {
  guests: SeatingGuest[];
  assignments: SeatingAssignmentWithGuest[];
  tables: Table[];
};

// ---- Input types ----

export type AssignSeatInput = {
  guest_id: string;
  table_id: string;
};

export type CreateTableInput = {
  name: string;
  number: string;
  category?: string | null;
  notes?: string | null;
  capacity: number;
  created_by?: string | null;
};

export type UpdateTableInput = {
  name?: string;
  number?: string;
  category?: string | null;
  notes?: string | null;
  capacity?: number;
};

// ---- Queries ----

async function getSeatingData(supabase: SupabaseClient): Promise<SeatingData> {
  const [{ data: guests }, { data: assignments }, { data: tables }] = await Promise.all([
    supabase
      .from('guests')
      .select('id, first_name, last_name, status, seating_assignments(id, table_id)')
      .eq('status', 'confirmed')
      .order('last_name'),
    supabase
      .from('seating_assignments')
      .select('*, guests(id, first_name, last_name), tables(id, name, number)')
      .order('table_id'),
    supabase.from('tables').select('*').order('number'),
  ]);

  return { guests: guests ?? [], assignments: assignments ?? [], tables: tables ?? [] };
}

// ---- Mutations ----

export async function createTable(
  supabase: SupabaseClient,
  input: CreateTableInput
): Promise<Table> {
  const { data, error } = await supabase.from('tables').insert(input).select().single();

  if (error) throw error;
  return data;
}

export async function deleteTable(supabase: SupabaseClient, tableId: string): Promise<void> {
  const { error } = await supabase.from('tables').delete().eq('id', tableId);

  if (error) throw error;
}

export async function updateTable(
  supabase: SupabaseClient,
  tableId: string,
  input: UpdateTableInput
): Promise<Table> {
  const { data, error } = await supabase
    .from('tables')
    .update(input)
    .eq('id', tableId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function assignSeat(supabase: SupabaseClient, input: AssignSeatInput): Promise<void> {
  const { error } = await supabase.from('seating_assignments').upsert(
    {
      guest_id: input.guest_id,
      table_id: input.table_id,
    },
    { onConflict: 'guest_id' }
  );

  if (error) throw error;
}

async function removeSeatAssignment(supabase: SupabaseClient, guestId: string): Promise<void> {
  const { error } = await supabase.from('seating_assignments').delete().eq('guest_id', guestId);

  if (error) throw error;
}

// ---- Family types ----

export type SeatingGuestChild = Pick<Guest, 'id' | 'first_name' | 'last_name' | 'status'> & {
  seating_assignments: Array<Pick<SeatingAssignment, 'id' | 'table_id'>>;
};

export type SeatingGuestWithFamily = SeatingGuest & {
  parent_guest_id: string | null;
  children: SeatingGuestChild[];
};

export type SeatingAssignmentWithFamilyGuest = SeatingAssignment & {
  guests: Pick<Guest, 'id' | 'first_name' | 'last_name' | 'parent_guest_id'>;
  tables: Pick<Table, 'id' | 'name' | 'number'>;
};

export type SeatingDataWithFamily = {
  guests: SeatingGuestWithFamily[];
  assignments: SeatingAssignmentWithFamilyGuest[];
  tables: Table[];
};

export type AssignSeatFamilyResult = {
  assigned: number;
  skipped_capacity: boolean;
  needed?: number;
  available?: number;
};

// ---- Family queries ----

export async function getSeatingDataWithFamily(
  supabase: SupabaseClient
): Promise<SeatingDataWithFamily> {
  const [{ data: parents }, { data: assignments }, { data: tables }] = await Promise.all([
    supabase
      .from('guests')
      .select('id, first_name, last_name, status, seating_assignments(id, table_id)')
      .is('parent_guest_id', null)
      .eq('status', 'confirmed')
      .order('last_name'),
    supabase
      .from('seating_assignments')
      .select('*, guests(id, first_name, last_name, parent_guest_id), tables(id, name, number)')
      .order('table_id'),
    supabase.from('tables').select('*').order('number'),
  ]);

  if (!parents || parents.length === 0) {
    return {
      guests: [],
      assignments: (assignments ?? []) as unknown as SeatingAssignmentWithFamilyGuest[],
      tables: tables ?? [],
    };
  }

  const parentIds = parents.map((p) => p.id);
  const { data: childrenData } = await supabase
    .from('guests')
    .select('id, first_name, last_name, status, parent_guest_id, seating_assignments(id, table_id)')
    .in('parent_guest_id', parentIds)
    .eq('status', 'confirmed')
    .order('first_name');

  const childrenByParent = new Map<string, SeatingGuestChild[]>();
  for (const child of childrenData ?? []) {
    const pid = (child as { parent_guest_id: string }).parent_guest_id;
    if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
    childrenByParent.get(pid)!.push(child as unknown as SeatingGuestChild);
  }

  const guestsWithFamily: SeatingGuestWithFamily[] = parents.map((p) => ({
    ...p,
    parent_guest_id: null,
    children: childrenByParent.get(p.id) ?? [],
  }));

  return {
    guests: guestsWithFamily,
    assignments: (assignments ?? []) as unknown as SeatingAssignmentWithFamilyGuest[],
    tables: tables ?? [],
  };
}

// ---- Family mutations ----

/**
 * Seats a guest at a table.
 * - A group head is seated together with their confirmed members that have no seat yet
 *   (members already seated elsewhere are left where they are).
 * - A member (child/companion) is seated on their own.
 * Capacity is counted per person.
 */
export async function assignSeatWithFamily(
  supabase: SupabaseClient,
  input: AssignSeatInput
): Promise<AssignSeatFamilyResult> {
  const { data: guestRow } = await supabase
    .from('guests')
    .select('id, parent_guest_id')
    .eq('id', input.guest_id)
    .single();

  let memberIds = [input.guest_id];

  if (guestRow && !guestRow.parent_guest_id) {
    const { data: children } = await supabase
      .from('guests')
      .select('id, seating_assignments(id)')
      .eq('parent_guest_id', input.guest_id)
      .eq('status', 'confirmed');

    const unseatedChildIds = (children ?? [])
      .filter((c) => !((c.seating_assignments as unknown[] | null) ?? []).length)
      .map((c) => c.id);
    memberIds = [input.guest_id, ...unseatedChildIds];
  }

  return seatMembers(supabase, memberIds, input.table_id);
}

/** Moves (or seats) one single person to a table, regardless of their group. */
export async function moveSeatMember(
  supabase: SupabaseClient,
  input: AssignSeatInput
): Promise<AssignSeatFamilyResult> {
  return seatMembers(supabase, [input.guest_id], input.table_id);
}

async function seatMembers(
  supabase: SupabaseClient,
  memberIds: string[],
  tableId: string
): Promise<AssignSeatFamilyResult> {
  const [{ data: tableRow }, { data: currentAssignments }] = await Promise.all([
    supabase.from('tables').select('capacity').eq('id', tableId).single(),
    supabase.from('seating_assignments').select('guest_id').eq('table_id', tableId),
  ]);

  const capacity = tableRow?.capacity ?? 0;
  const seatedHere = new Set((currentAssignments ?? []).map((a) => a.guest_id as string));
  const toSeat = memberIds.filter((id) => !seatedHere.has(id));
  const available = Math.max(0, capacity - seatedHere.size);

  if (toSeat.length > available) {
    return { assigned: 0, skipped_capacity: true, needed: toSeat.length, available };
  }
  if (toSeat.length === 0) return { assigned: 0, skipped_capacity: false };

  const { error } = await supabase.from('seating_assignments').upsert(
    toSeat.map((id) => ({ guest_id: id, table_id: tableId })),
    { onConflict: 'guest_id' }
  );

  if (error) throw error;
  return { assigned: toSeat.length, skipped_capacity: false };
}

/** Removes the seat of one single person (their group is not affected). */
export async function removeSeatMember(supabase: SupabaseClient, guestId: string): Promise<void> {
  await removeSeatAssignment(supabase, guestId);
}
