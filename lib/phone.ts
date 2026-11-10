/**
 * Phone numbers: only US and Dominican Republic numbers are used, and both are
 * NANP (+1). The canonical format everywhere is `+1 (###) ###-####`, even when
 * the +1 was not typed.
 */

const NATIONAL_LENGTH = 10;

/** The 10 national digits (no country code), or '' when there are none. */
export function nationalDigits(value: string | null | undefined): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  // NANP area codes never start with 1, so a leading 1 is always the country code.
  if (digits.startsWith('1')) digits = digits.slice(1);
  return digits.slice(0, NATIONAL_LENGTH);
}

/** Progressive mask: "+1 (829", "+1 (829) 775", "+1 (829) 775-4940". */
export function formatPhone(value: string | null | undefined): string {
  const d = nationalDigits(value);
  if (!d) return '';
  let out = `+1 (${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6)}`;
  return out;
}

/** Value to store: formatted when it is a full number, otherwise cleaned as-is (or null). */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  const d = nationalDigits(value);
  return d.length === NATIONAL_LENGTH ? formatPhone(d) : value.trim();
}

/** `tel:` href, e.g. "tel:+18297754940". */
export function phoneHref(value: string | null | undefined): string | null {
  const d = nationalDigits(value);
  return d.length === NATIONAL_LENGTH ? `tel:+1${d}` : null;
}

/**
 * onChange helper for masked inputs. Backspacing over mask punctuation would
 * otherwise re-format to the same text and get stuck, so drop a digit instead.
 */
export function maskPhoneInput(next: string, previous: string): string {
  if (next.length < previous.length && nationalDigits(next) === nationalDigits(previous)) {
    return formatPhone(nationalDigits(previous).slice(0, -1));
  }
  return formatPhone(next);
}
