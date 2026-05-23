import { z } from 'zod'

const VALID_STATUSES = ['pending', 'confirmed', 'declined', 'tentative'] as const

/** Converts empty/blank string to null, otherwise trims */
const stringOrNull = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v),
  z.string().nullable().optional(),
)

/** Parses TRUE/FALSE/"1"/"0"/boolean/number → boolean */
function parseBool(v: unknown, defaultValue: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const lower = v.trim().toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'sí' || lower === 'si') return true
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') return false
  }
  return defaultValue
}

export const importRowSchema = z.object({
  first_name: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z.string().min(1, 'First name is required'),
  ),
  last_name: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z.string().min(1, 'Last name is required'),
  ),
  email: stringOrNull,
  phone: stringOrNull,
  status: z.preprocess(
    (v) => {
      if (typeof v !== 'string' || v.trim() === '') return 'pending'
      const lower = v.trim().toLowerCase()
      if (VALID_STATUSES.includes(lower as (typeof VALID_STATUSES)[number])) return lower
      // Spanish aliases
      if (lower === 'confirmado' || lower === 'confirmed') return 'confirmed'
      if (lower === 'pendiente' || lower === 'pending') return 'pending'
      if (lower === 'declinado' || lower === 'declined') return 'declined'
      if (lower === 'tentativo' || lower === 'tentative') return 'tentative'
      return 'pending'
    },
    z.enum(VALID_STATUSES),
  ),
  dietary_restrictions: stringOrNull,
  notes: stringOrNull,
  is_plus_one: z.preprocess(
    (v) => parseBool(v, false),
    z.boolean(),
  ),
  /** Raw CSV string of category names, e.g. "Family, Friends" */
  categories: stringOrNull,
  ceremony_attending: z.preprocess(
    (v) => parseBool(v, true),
    z.boolean(),
  ),
  reception_attending: z.preprocess(
    (v) => parseBool(v, true),
    z.boolean(),
  ),
  /** Table number string — read-only on import (informational) */
  table_number: stringOrNull,
})

export type ImportRowInput = z.infer<typeof importRowSchema>

export interface ImportRowResult {
  row: number
  raw: Record<string, string>
  parsed?: ImportRowInput
  error?: string
}

/**
 * Validates an array of raw rows (keyed by the GUEST_COLUMNS keys after mapping).
 * Returns validated rows and per-row errors.
 */
export function validateImportRows(rawRows: Record<string, string>[]): {
  valid: Array<{ row: number; data: ImportRowInput }>
  errors: ImportRowResult[]
} {
  const valid: Array<{ row: number; data: ImportRowInput }> = []
  const errors: ImportRowResult[] = []

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2 // 1-based + header row
    const result = importRowSchema.safeParse(raw)
    if (result.success) {
      valid.push({ row: rowNumber, data: result.data })
    } else {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      errors.push({ row: rowNumber, raw, error: messages })
    }
  })

  return { valid, errors }
}
