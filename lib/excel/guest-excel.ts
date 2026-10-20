import * as XLSX from 'xlsx';

import type { Category } from '@/lib/types';

import type { GuestListItem } from '@/services/guest.service';

import { GUEST_COLUMNS } from './guest-columns';

/** Header label by column key, for the exported file */
const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  GUEST_COLUMNS.map((c) => [c.key, c.label])
);

function boolToCell(value: boolean | null | undefined): string {
  if (value == null) return '';
  return value ? 'TRUE' : 'FALSE';
}

function parseAttendance(
  attendance: GuestListItem['event_attendance'],
  eventType: 'ceremony' | 'reception'
): string {
  const entry = attendance.find((a) => a.event_type === eventType || a.event_type === 'both');
  if (!entry) return '';
  return boolToCell(entry.attending);
}

/**
 * Convert a list of guests to an XLSX Workbook and trigger a browser download.
 *
 * @param guests   Filtered guest list from GuestList state
 * @param selectedKeys  Column keys to include (ordered)
 * @param categories  All categories (used for lookup — not strictly needed here since data is embedded)
 * @param filename  Output filename without extension
 */
export function exportGuestsToExcel(
  guests: GuestListItem[],
  selectedKeys: string[],
  _categories: Category[],
  filename = 'guests'
): void {
  // Build rows
  const rows = guests.map((guest) => {
    const row: Record<string, string | number | boolean> = {};

    for (const key of selectedKeys) {
      switch (key) {
        case 'first_name':
          row[COLUMN_LABELS[key]] = guest.first_name;
          break;
        case 'last_name':
          row[COLUMN_LABELS[key]] = guest.last_name;
          break;
        case 'email':
          row[COLUMN_LABELS[key]] = guest.email ?? '';
          break;
        case 'phone':
          row[COLUMN_LABELS[key]] = guest.phone ?? '';
          break;
        case 'status':
          row[COLUMN_LABELS[key]] = guest.status;
          break;
        case 'dietary_restrictions':
          row[COLUMN_LABELS[key]] = guest.dietary_restrictions ?? '';
          break;
        case 'notes':
          row[COLUMN_LABELS[key]] = guest.notes ?? '';
          break;
        case 'is_plus_one':
          row[COLUMN_LABELS[key]] = boolToCell(guest.is_plus_one);
          break;
        case 'categories':
          row[COLUMN_LABELS[key]] = guest.guest_categories
            .map((gc) => gc.categories.name)
            .join(', ');
          break;
        case 'ceremony_attending':
          row[COLUMN_LABELS[key]] = parseAttendance(guest.event_attendance, 'ceremony');
          break;
        case 'reception_attending':
          row[COLUMN_LABELS[key]] = parseAttendance(guest.event_attendance, 'reception');
          break;
        case 'table_number':
          row[COLUMN_LABELS[key]] = guest.seating_assignments[0]?.tables?.number ?? '';
          break;
        default:
          break;
      }
    }

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');

  // Auto-width columns
  const colWidths = selectedKeys.map((key) => {
    const header = COLUMN_LABELS[key] ?? key;
    const maxLen = Math.max(header.length, ...rows.map((r) => String(r[header] ?? '').length));
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Generates and downloads a template .xlsx with all guest columns as headers
 * and one illustrative example row, so users know how to format their data.
 */
export function downloadGuestTemplate(filename = 'guests-template'): void {
  const allKeys = GUEST_COLUMNS.map((c) => c.key);

  const exampleRow: Record<string, string> = {
    [COLUMN_LABELS['first_name']]: 'María',
    [COLUMN_LABELS['last_name']]: 'García',
    [COLUMN_LABELS['email']]: 'maria@ejemplo.com',
    [COLUMN_LABELS['phone']]: '+1 809 555 0100',
    [COLUMN_LABELS['status']]: 'pending',
    [COLUMN_LABELS['dietary_restrictions']]: 'Vegetariana',
    [COLUMN_LABELS['notes']]: 'Mesa cerca de la pista de baile',
    [COLUMN_LABELS['is_plus_one']]: 'FALSE',
    [COLUMN_LABELS['categories']]: 'Familia, Amigos de la novia',
    [COLUMN_LABELS['ceremony_attending']]: 'TRUE',
    [COLUMN_LABELS['reception_attending']]: 'TRUE',
    [COLUMN_LABELS['table_number']]: '5',
  };

  const ws = XLSX.utils.json_to_sheet([exampleRow], {
    header: allKeys.map((k) => COLUMN_LABELS[k]),
  });

  // Auto-width
  ws['!cols'] = allKeys.map((key) => {
    const header = COLUMN_LABELS[key] ?? key;
    return {
      wch: Math.min(Math.max(header.length, String(exampleRow[header] ?? '').length) + 2, 50),
    };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Parse an uploaded File/Blob as an XLSX workbook and return
 * the first sheet as an array of objects keyed by header row.
 */
export async function parseExcelFile(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // header: 1 → returns array of arrays; first row = headers
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });

  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = (raw[0] as string[]).map((h) => String(h ?? '').trim());
  const dataRows = raw.slice(1) as string[][];

  const rows: Record<string, string>[] = dataRows.flatMap((row) => {
    if (!row.some((cell) => String(cell).trim() !== '')) return [];
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = String(row[i] ?? '').trim();
    });
    return [obj];
  });

  return { headers, rows };
}
