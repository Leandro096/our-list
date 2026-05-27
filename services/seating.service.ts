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

export async function getSeatingData(supabase: SupabaseClient): Promise<SeatingData> {
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

export async function assignSeat(supabase: SupabaseClient, input: AssignSeatInput): Promise<void> {
  const { error } = await supabase.from('seating_assignments').upsert(
    {
      guest_id: input.guest_id,
      table_id: input.table_id,
    },
    { onConflict: 'guest_id' }
  );

  if (error) throw error;
}

export async function removeSeatAssignment(
  supabase: SupabaseClient,
  guestId: string
): Promise<void> {
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

export async function assignSeatWithFamily(
  supabase: SupabaseClient,
  input: AssignSeatInput
): Promise<AssignSeatFamilyResult> {
  // Resolve root parent
  const { data: guestRow } = await supabase
    .from('guests')
    .select('id, parent_guest_id')
    .eq('id', input.guest_id)
    .single();

  const rootId = guestRow?.parent_guest_id ?? input.guest_id;

  // Get all family members (root + children)
  const { data: children } = await supabase
    .from('guests')
    .select('id')
    .eq('parent_guest_id', rootId);

  const memberIds = [rootId, ...(children ?? []).map((c) => c.id)];

  // Check table capacity
  const { data: tableRow } = await supabase
    .from('tables')
    .select('capacity')
    .eq('id', input.table_id)
    .single();

  const { data: currentAssignments } = await supabase
    .from('seating_assignments')
    .select('guest_id')
    .eq('table_id', input.table_id);

  const capacity = tableRow?.capacity ?? 0;
  const currentCount = (currentAssignments ?? []).length;
  const needed = memberIds.length;
  const available = Math.max(0, capacity - currentCount);

  if (currentCount + needed > capacity) {
    return { assigned: 0, skipped_capacity: true, needed, available };
  }

  // Assign all family members
  const upsertRows = memberIds.map((id) => ({ guest_id: id, table_id: input.table_id }));
  const { error } = await supabase
    .from('seating_assignments')
    .upsert(upsertRows, { onConflict: 'guest_id' });

  if (error) throw error;
  return { assigned: memberIds.length, skipped_capacity: false };
}

export async function removeSeatAssignmentWithFamily(
  supabase: SupabaseClient,
  guestId: string
): Promise<void> {
  // Resolve root parent
  const { data: guestRow } = await supabase
    .from('guests')
    .select('id, parent_guest_id')
    .eq('id', guestId)
    .single();

  const rootId = guestRow?.parent_guest_id ?? guestId;

  // Get all family members
  const { data: children } = await supabase
    .from('guests')
    .select('id')
    .eq('parent_guest_id', rootId);

  const memberIds = [rootId, ...(children ?? []).map((c) => c.id)];

  const { error } = await supabase.from('seating_assignments').delete().in('guest_id', memberIds);

  if (error) throw error;
}
