import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  User,
  Guest,
  Table,
  ScanLog,
  Category,
  EventAttendance,
  SeatingAssignment,
} from '@/lib/types';

// ---- Return types ----

export type GuestListItem = Guest & {
  guest_categories: Array<{
    category_id: string;
    categories: Pick<Category, 'id' | 'name' | 'color'>;
  }>;
  event_attendance: EventAttendance[];
  seating_assignments: Array<SeatingAssignment & { tables: Pick<Table, 'number'> | null }>;
};

export type GuestDetail = Guest & {
  guest_categories: Array<{
    category_id: string;
    categories: Pick<Category, 'id' | 'name' | 'color'>;
  }>;
  event_attendance: EventAttendance[];
  seating_assignments: Array<SeatingAssignment & { tables: Pick<Table, 'number'> | null }>;
  scan_logs: Array<ScanLog & { users: Pick<User, 'display_name'> | null }>;
};

export type GuestForEdit = Guest & {
  guest_categories: Array<{ category_id: string }>;
  event_attendance: Array<{ event_type: string; attending: boolean | null }>;
  children: Array<{
    id: string;
    first_name: string;
    last_name: string;
    is_plus_one: boolean;
  }>;
};

// ---- Input types ----

export type CreateGuestInput = Pick<
  Guest,
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'status'
  | 'dietary_restrictions'
  | 'notes'
  | 'is_plus_one'
> & {
  selectedCategories: string[];
  ceremony_attending: boolean;
  reception_attending: boolean;
  parent_guest_id?: string | null;
};

export type UpdateGuestInput = Partial<
  Pick<
    Guest,
    | 'first_name'
    | 'last_name'
    | 'email'
    | 'phone'
    | 'status'
    | 'dietary_restrictions'
    | 'notes'
    | 'is_plus_one'
  >
> & {
  selectedCategories?: string[];
  parent_guest_id?: string | null;
};

// ---- Queries ----

export async function getGuests(supabase: SupabaseClient): Promise<GuestListItem[]> {
  const { data } = await supabase
    .from('guests')
    .select(
      `
      *,
      guest_categories(
        category_id,
        categories(id, name, color)
      ),
      event_attendance(*),
      seating_assignments(*, tables(number))
    `
    )
    .order('created_at', { ascending: false });

  return data ?? [];
}

// ---- Paginated query ----

export interface GuestListParams {
  search?: string;
  status?: string;
  categoryIds?: string[];
  sortBy?: 'first_name' | 'last_name' | 'status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface GuestListResult {
  data: GuestListItem[];
  count: number;
}

export async function getGuestsPaginated(
  supabase: SupabaseClient,
  params: GuestListParams = {}
): Promise<GuestListResult> {
  const {
    search,
    status,
    categoryIds,
    sortBy = 'first_name',
    sortOrder = 'asc',
    page = 1,
    pageSize = 50,
  } = params;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Pre-filter by category with subset matching:
  // guests must contain all selected categories (extras are allowed)
  let guestIds: string[] | null = null;
  if (categoryIds && categoryIds.length > 0) {
    const selected = Array.from(new Set(categoryIds));

    // Pull category rows for selected categories only, then keep guests
    // that match every selected category at least once.
    const { data: catRows } = await supabase
      .from('guest_categories')
      .select('guest_id, category_id')
      .in('category_id', selected);

    const matchedByGuest = new Map<string, Set<string>>();
    for (const row of catRows ?? []) {
      const item = row as { guest_id: string; category_id: string };
      if (!matchedByGuest.has(item.guest_id)) matchedByGuest.set(item.guest_id, new Set());
      matchedByGuest.get(item.guest_id)!.add(item.category_id);
    }

    guestIds = [];
    for (const [guestId, matchedSet] of matchedByGuest) {
      if (matchedSet.size === selected.length) {
        guestIds.push(guestId);
      }
    }

    if (guestIds.length === 0) return { data: [], count: 0 };
  }

  let query = supabase
    .from('guests')
    .select(
      `*, guest_categories(category_id, categories(id, name, color)), event_attendance(*), seating_assignments(*, tables(number))`,
      { count: 'exact' }
    );

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (guestIds !== null) {
    query = query.in('id', guestIds);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

  const { data, count } = await query;

  return { data: (data ?? []) as GuestListItem[], count: count ?? 0 };
}

export async function getGuestById(
  supabase: SupabaseClient,
  id: string
): Promise<GuestDetail | null> {
  const { data } = await supabase
    .from('guests')
    .select(
      `
      *,
      guest_categories(
        category_id,
        categories(id, name, color)
      ),
      event_attendance(*),
      seating_assignments(*, tables(number)),
      scan_logs(*, users!scan_logs_scanned_by_fkey(display_name))
    `
    )
    .eq('id', id)
    .single();

  return data ?? null;
}

export async function getGuestToConfirm(
  supabase: SupabaseClient,
  id: string
): Promise<Guest | null> {
  const { data } = await supabase.from('guests').select('*').eq('id', id).single();

  return data ?? null;
}

export async function getGuestForEdit(
  supabase: SupabaseClient,
  id: string
): Promise<GuestForEdit | null> {
  const { data } = await supabase
    .from('guests')
    .select(
      `
      *,
      guest_categories(category_id),
      event_attendance(event_type, attending)
    `
    )
    .eq('id', id)
    .single();

  if (!data) return null;

  const { data: childrenData } = await supabase
    .from('guests')
    .select('id, first_name, last_name, is_plus_one')
    .eq('parent_guest_id', id)
    .order('first_name');

  return {
    ...(data as Omit<GuestForEdit, 'children'>),
    children: childrenData ?? [],
  };
}

// ---- Mutations ----

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: operación no respondió en ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function createGuest(
  supabase: SupabaseClient,
  input: CreateGuestInput
): Promise<Guest> {
  const { selectedCategories, ceremony_attending, reception_attending, ...rawFields } = input;

  const guestFields = {
    ...rawFields,
    email: rawFields.email || null,
    phone: rawFields.phone || null,
    dietary_restrictions: rawFields.dietary_restrictions || null,
    notes: rawFields.notes || null,
  };

  const { data, error } = await withTimeout(
    supabase.from('guests').insert(guestFields).select().single(),
    10000,
    'createGuest'
  );
  if (error) throw error;

  const guest = data as Guest;

  if (selectedCategories.length > 0) {
    const { error: catError } = await withTimeout(
      supabase
        .from('guest_categories')
        .insert(selectedCategories.map((category_id) => ({ guest_id: guest.id, category_id }))),
      10000,
      'createGuest:categories'
    );
    if (catError) throw catError;
  }

  const attendanceRows = [
    ...(ceremony_attending
      ? [{ guest_id: guest.id, event_type: 'ceremony', attending: true }]
      : []),
    ...(reception_attending
      ? [{ guest_id: guest.id, event_type: 'reception', attending: true }]
      : []),
  ];
  if (attendanceRows.length > 0) {
    const { error: attError } = await withTimeout(
      supabase.from('event_attendance').insert(attendanceRows),
      10000,
      'createGuest:attendance'
    );
    if (attError) throw attError;
  }

  return guest;
}

export async function updateGuest(
  supabase: SupabaseClient,
  id: string,
  input: UpdateGuestInput
): Promise<void> {
  const { selectedCategories, ...rawFields } = input;

  const fields = {
    ...rawFields,
    email: rawFields.email !== undefined ? rawFields.email || null : undefined,
    phone: rawFields.phone !== undefined ? rawFields.phone || null : undefined,
    dietary_restrictions:
      rawFields.dietary_restrictions !== undefined
        ? rawFields.dietary_restrictions || null
        : undefined,
    notes: rawFields.notes !== undefined ? rawFields.notes || null : undefined,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await withTimeout(
    supabase.from('guests').update(fields).eq('id', id),
    10000,
    'updateGuest'
  );
  if (updateError) throw updateError;

  if (selectedCategories !== undefined) {
    const { error: deleteError } = await withTimeout(
      supabase.from('guest_categories').delete().eq('guest_id', id),
      10000,
      'updateGuest:deleteCategories'
    );
    if (deleteError) throw deleteError;

    if (selectedCategories.length > 0) {
      const { error: insertError } = await withTimeout(
        supabase
          .from('guest_categories')
          .insert(selectedCategories.map((category_id) => ({ guest_id: id, category_id }))),
        10000,
        'updateGuest:insertCategories'
      );
      if (insertError) throw insertError;
    }
  }
}

export async function deleteGuest(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkDeleteGuests(supabase: SupabaseClient, ids: string[]): Promise<void> {
  const { error } = await supabase.from('guests').delete().in('id', ids);
  if (error) throw error;
}

// ---- Family types ----

export type GuestFamilyMember = Pick<
  Guest,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'status'
  | 'is_plus_one'
  | 'parent_guest_id'
  | 'invitation_guid'
> & {
  guest_categories: Array<{
    category_id: string;
    categories: Pick<Category, 'id' | 'name' | 'color'>;
  }>;
  event_attendance: EventAttendance[];
  seating_assignments: Array<SeatingAssignment & { tables: Pick<Table, 'number'> | null }>;
};

export type GuestDetailWithFamily = GuestDetail & {
  family_role: 'parent' | 'child';
  children: GuestFamilyMember[];
  parent: GuestFamilyMember | null;
  siblings: GuestFamilyMember[];
};

export type GuestListItemWithFamily = GuestListItem & {
  has_children?: boolean;
};

export type GuestListResultWithFamily = {
  data: GuestListItemWithFamily[];
  count: number;
};

// ---- Family constants ----

const FAMILY_MEMBER_SELECT =
  'id, first_name, last_name, status, is_plus_one, parent_guest_id, invitation_guid, guest_categories(category_id, categories(id, name, color)), event_attendance(*), seating_assignments(*, tables(number))';

// ---- Family queries ----

export async function getGuestByIdWithFamily(
  supabase: SupabaseClient,
  id: string
): Promise<GuestDetailWithFamily | null> {
  const base = await getGuestById(supabase, id);
  if (!base) return null;

  const family_role: 'parent' | 'child' = base.parent_guest_id === null ? 'parent' : 'child';
  let children: GuestFamilyMember[] = [];
  let parent: GuestFamilyMember | null = null;
  let siblings: GuestFamilyMember[] = [];

  if (family_role === 'parent') {
    const { data: childrenData } = await supabase
      .from('guests')
      .select(FAMILY_MEMBER_SELECT)
      .eq('parent_guest_id', id)
      .order('first_name');
    children = (childrenData ?? []) as unknown as GuestFamilyMember[];
  } else {
    const [{ data: parentData }, { data: siblingsData }] = await Promise.all([
      supabase.from('guests').select(FAMILY_MEMBER_SELECT).eq('id', base.parent_guest_id!).single(),
      supabase
        .from('guests')
        .select(FAMILY_MEMBER_SELECT)
        .eq('parent_guest_id', base.parent_guest_id!)
        .neq('id', id)
        .order('first_name'),
    ]);
    parent = (parentData ?? null) as unknown as GuestFamilyMember | null;
    siblings = (siblingsData ?? []) as unknown as GuestFamilyMember[];
  }

  return { ...base, family_role, children, parent, siblings };
}

export async function getGuestsPaginatedWithFamily(
  supabase: SupabaseClient,
  params: GuestListParams = {}
): Promise<GuestListResultWithFamily> {
  const { data, count } = await getGuestsPaginated(supabase, params);
  if (data.length === 0) return { data: [], count };

  const pageIds = data.map((g) => g.id);
  const { data: childRows } = await supabase
    .from('guests')
    .select('parent_guest_id')
    .in('parent_guest_id', pageIds);

  const parentIds = new Set(
    (childRows ?? []).map((r: { parent_guest_id: string }) => r.parent_guest_id)
  );

  return {
    data: data.map((g) => ({ ...g, has_children: parentIds.has(g.id) })),
    count,
  };
}

export async function getAvailableParentGuests(
  supabase: SupabaseClient,
  excludeId?: string
): Promise<Array<Pick<Guest, 'id' | 'first_name' | 'last_name'>>> {
  let query = supabase
    .from('guests')
    .select('id, first_name, last_name')
    .is('parent_guest_id', null)
    .order('first_name');

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getGuestChildren(
  supabase: SupabaseClient,
  parentId: string
): Promise<GuestFamilyMember[]> {
  const { data } = await supabase
    .from('guests')
    .select(FAMILY_MEMBER_SELECT)
    .eq('parent_guest_id', parentId)
    .order('first_name');
  return (data ?? []) as unknown as GuestFamilyMember[];
}

export async function linkGuestToParent(
  supabase: SupabaseClient,
  childId: string,
  parentId: string
): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({ parent_guest_id: parentId, updated_at: new Date().toISOString() })
    .eq('id', childId);
  if (error) throw error;
}

export async function unlinkGuestFromParent(
  supabase: SupabaseClient,
  childId: string
): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({ parent_guest_id: null, is_plus_one: false, updated_at: new Date().toISOString() })
    .eq('id', childId);
  if (error) throw error;
}
