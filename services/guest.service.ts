import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  EventAttendance,
  Guest,
  ScanLog,
  SeatingAssignment,
  Table,
  User,
} from "@/lib/types";

// ---- Return types ----

export type GuestListItem = Guest & {
  guest_categories: Array<{
    category_id: string;
    categories: Pick<Category, "id" | "name" | "color">;
  }>;
  event_attendance: EventAttendance[];
  seating_assignments: Array<SeatingAssignment & { tables: Pick<Table, "number"> | null }>;
};

export type GuestDetail = Guest & {
  guest_categories: Array<{
    category_id: string;
    categories: Pick<Category, "id" | "name" | "color">;
  }>;
  event_attendance: EventAttendance[];
  seating_assignments: Array<SeatingAssignment & { tables: Pick<Table, "number"> | null }>;
  scan_logs: Array<ScanLog & { users: Pick<User, "display_name"> | null }>;
};

export type GuestForEdit = Guest & {
  guest_categories: Array<{ category_id: string }>;
};

// ---- Input types ----

export type CreateGuestInput = Pick<
  Guest,
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "status"
  | "dietary_restrictions"
  | "notes"
  | "is_plus_one"
> & {
  selectedCategories: string[];
  ceremony_attending: boolean;
  reception_attending: boolean;
};

export type UpdateGuestInput = Partial<
  Pick<
    Guest,
    | "first_name"
    | "last_name"
    | "email"
    | "phone"
    | "status"
    | "dietary_restrictions"
    | "notes"
    | "is_plus_one"
  >
> & {
  selectedCategories?: string[];
};

// ---- Queries ----

export async function getGuests(
  supabase: SupabaseClient,
): Promise<GuestListItem[]> {
  const { data } = await supabase
    .from("guests")
    .select(
      `
      *,
      guest_categories(
        category_id,
        categories(id, name, color)
      ),
      event_attendance(*),
      seating_assignments(*, tables(number))
    `,
    )
    .order("created_at", { ascending: false });

  return data ?? [];
}

// ---- Paginated query ----

export interface GuestListParams {
  search?: string;
  status?: string;
  categoryIds?: string[];
  sortBy?: "first_name" | "last_name" | "status" | "created_at";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface GuestListResult {
  data: GuestListItem[];
  count: number;
}

export async function getGuestsPaginated(
  supabase: SupabaseClient,
  params: GuestListParams = {},
): Promise<GuestListResult> {
  const {
    search,
    status,
    categoryIds,
    sortBy = "first_name",
    sortOrder = "asc",
    page = 1,
    pageSize = 50,
  } = params;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Pre-filter by category via a separate query (PostgREST join filtering)
  let guestIds: string[] | null = null;
  if (categoryIds && categoryIds.length > 0) {
    const { data: catRows } = await supabase
      .from("guest_categories")
      .select("guest_id")
      .in("category_id", categoryIds);
    guestIds = Array.from(new Set((catRows ?? []).map((r: { guest_id: string }) => r.guest_id)));
    if (guestIds.length === 0) return { data: [], count: 0 };
  }

  let query = supabase
    .from("guests")
    .select(
      `*, guest_categories(category_id, categories(id, name, color)), event_attendance(*), seating_assignments(*, tables(number))`,
      { count: "exact" },
    );

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (guestIds !== null) {
    query = query.in("id", guestIds);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);

  const { data, count } = await query;

  return { data: (data ?? []) as GuestListItem[], count: count ?? 0 };
}

export async function getGuestById(
  supabase: SupabaseClient,
  id: string,
): Promise<GuestDetail | null> {
  const { data } = await supabase
    .from("guests")
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
    `,
    )
    .eq("id", id)
    .single();

  return data ?? null;
}

export async function getGuestToConfirm(
  supabase: SupabaseClient,
  id: string,
): Promise<Guest | null> {
  const { data } = await supabase
    .from("guests")
    .select("*")
    .eq("id", id)
    .single();

  return data ?? null;
}

export async function getGuestForEdit(
  supabase: SupabaseClient,
  id: string,
): Promise<GuestForEdit | null> {
  const { data } = await supabase
    .from("guests")
    .select(
      `
      *,
      guest_categories(category_id)
    `,
    )
    .eq("id", id)
    .single();

  return data ?? null;
}

// ---- Mutations ----

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: operación no respondió en ${ms / 1000}s`)), ms),
    ),
  ]);
}

export async function createGuest(
  supabase: SupabaseClient,
  input: CreateGuestInput,
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
    'createGuest',
  );
  if (error) throw error;

  const guest = data as Guest;

  if (selectedCategories.length > 0) {
    const { error: catError } = await withTimeout(
      supabase.from('guest_categories').insert(
        selectedCategories.map((category_id) => ({ guest_id: guest.id, category_id })),
      ),
      10000,
      'createGuest:categories',
    );
    if (catError) throw catError;
  }

  const attendanceRows = [
    ...(ceremony_attending ? [{ guest_id: guest.id, event_type: 'ceremony', attending: true }] : []),
    ...(reception_attending ? [{ guest_id: guest.id, event_type: 'reception', attending: true }] : []),
  ];
  if (attendanceRows.length > 0) {
    const { error: attError } = await withTimeout(
      supabase.from('event_attendance').insert(attendanceRows),
      10000,
      'createGuest:attendance',
    );
    if (attError) throw attError;
  }

  return guest;
}

export async function updateGuest(
  supabase: SupabaseClient,
  id: string,
  input: UpdateGuestInput,
): Promise<void> {
  const { selectedCategories, ...rawFields } = input;

  const fields = {
    ...rawFields,
    email: rawFields.email !== undefined ? (rawFields.email || null) : undefined,
    phone: rawFields.phone !== undefined ? (rawFields.phone || null) : undefined,
    dietary_restrictions: rawFields.dietary_restrictions !== undefined ? (rawFields.dietary_restrictions || null) : undefined,
    notes: rawFields.notes !== undefined ? (rawFields.notes || null) : undefined,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await withTimeout(
    supabase.from('guests').update(fields).eq('id', id),
    10000,
    'updateGuest',
  );
  if (updateError) throw updateError;

  if (selectedCategories !== undefined) {
    const { error: deleteError } = await withTimeout(
      supabase.from('guest_categories').delete().eq('guest_id', id),
      10000,
      'updateGuest:deleteCategories',
    );
    if (deleteError) throw deleteError;

    if (selectedCategories.length > 0) {
      const { error: insertError } = await withTimeout(
        supabase.from('guest_categories').insert(
          selectedCategories.map((category_id) => ({ guest_id: id, category_id })),
        ),
        10000,
        'updateGuest:insertCategories',
      );
      if (insertError) throw insertError;
    }
  }
}

export async function deleteGuest(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("guests").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkDeleteGuests(
  supabase: SupabaseClient,
  ids: string[],
): Promise<void> {
  const { error } = await supabase.from("guests").delete().in("id", ids);
  if (error) throw error;
}
