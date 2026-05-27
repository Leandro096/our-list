export type ColumnGroup = 'basic' | 'attendance' | 'logistics';

export interface GuestColumn {
  key: string;
  label: string;
  group: ColumnGroup;
  required: boolean;
  hint?: string;
}

export const GUEST_COLUMNS: GuestColumn[] = [
  { key: 'first_name', label: 'First Name', group: 'basic', required: true },
  { key: 'last_name', label: 'Last Name', group: 'basic', required: true },
  { key: 'email', label: 'Email', group: 'basic', required: false },
  { key: 'phone', label: 'Phone', group: 'basic', required: false },
  {
    key: 'status',
    label: 'Status',
    group: 'basic',
    required: false,
    hint: 'pending | confirmed | declined | tentative',
  },
  { key: 'dietary_restrictions', label: 'Dietary Restrictions', group: 'basic', required: false },
  { key: 'notes', label: 'Notes', group: 'basic', required: false },
  { key: 'is_plus_one', label: 'Plus One', group: 'basic', required: false, hint: 'TRUE / FALSE' },
  {
    key: 'categories',
    label: 'Categories',
    group: 'logistics',
    required: false,
    hint: 'Comma-separated names',
  },
  {
    key: 'ceremony_attending',
    label: 'Ceremony',
    group: 'attendance',
    required: false,
    hint: 'TRUE / FALSE',
  },
  {
    key: 'reception_attending',
    label: 'Reception',
    group: 'attendance',
    required: false,
    hint: 'TRUE / FALSE',
  },
  { key: 'table_number', label: 'Table', group: 'logistics', required: false },
];

/** Keys that are always exported (user cannot deselect them) */
export const REQUIRED_EXPORT_COLUMNS = ['first_name', 'last_name'];

/** Default selection for export (all columns) */
export const DEFAULT_EXPORT_COLUMNS = GUEST_COLUMNS.map((c) => c.key);

/**
 * Common alias headers users might have in their own spreadsheets.
 * Maps lowercase trimmed header → guest column key.
 */
export const HEADER_ALIASES: Record<string, string> = {
  // first_name
  'first name': 'first_name',
  firstname: 'first_name',
  nombre: 'first_name',
  'primer nombre': 'first_name',
  // last_name
  'last name': 'last_name',
  lastname: 'last_name',
  apellido: 'last_name',
  'apellido(s)': 'last_name',
  // email
  email: 'email',
  correo: 'email',
  'correo electrónico': 'email',
  'e-mail': 'email',
  // phone
  phone: 'phone',
  teléfono: 'phone',
  telefono: 'phone',
  celular: 'phone',
  // status
  status: 'status',
  estado: 'status',
  rsvp: 'status',
  // dietary_restrictions
  'dietary restrictions': 'dietary_restrictions',
  'restricciones alimentarias': 'dietary_restrictions',
  dieta: 'dietary_restrictions',
  // notes
  notes: 'notes',
  notas: 'notes',
  observaciones: 'notes',
  // is_plus_one
  'plus one': 'is_plus_one',
  'plus 1': 'is_plus_one',
  acompañante: 'is_plus_one',
  // categories
  categories: 'categories',
  categorías: 'categories',
  categoria: 'categories',
  categoría: 'categories',
  grupo: 'categories',
  // ceremony
  ceremony: 'ceremony_attending',
  ceremonia: 'ceremony_attending',
  'ceremony attending': 'ceremony_attending',
  // reception
  reception: 'reception_attending',
  recepción: 'reception_attending',
  recepcion: 'reception_attending',
  'reception attending': 'reception_attending',
  // table
  table: 'table_number',
  'table number': 'table_number',
  mesa: 'table_number',
  'número de mesa': 'table_number',
  'numero de mesa': 'table_number',
};

/** Auto-detect the guest column key from a raw header string. Returns undefined if not matched. */
export function detectColumnKey(rawHeader: string): string | undefined {
  const normalized = rawHeader.trim().toLowerCase();
  // Exact match first
  if (HEADER_ALIASES[normalized]) return HEADER_ALIASES[normalized];
  // Partial match with known keys
  const col = GUEST_COLUMNS.find((c) => c.key === normalized);
  if (col) return col.key;
  return undefined;
}
