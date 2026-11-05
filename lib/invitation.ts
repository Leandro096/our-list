/** Helpers shared by the dashboard (sending) and the public save-the-date page (/i/<code>). */

export const COUPLE_NAMES = process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Candy & Leandro';
/** ISO date (YYYY-MM-DD) of the wedding. Saturday, May 22, 2027 unless overridden. */
export const WEDDING_DATE_ISO = process.env.NEXT_PUBLIC_WEDDING_DATE ?? '2027-05-22';

/** "Save the date" photos by Annabella Giraldo, served from /public/invitation. */
export const PHOTOGRAPHER = {
  handle: '@annabellagiraldophoto',
  url: 'https://www.instagram.com/annabellagiraldophoto/',
};
export const INVITATION_PHOTOS = {
  hero: '/invitation/hero.jpg',
  strip: ['/invitation/strip-1.jpg', '/invitation/strip-2.jpg', '/invitation/strip-3.jpg'],
};

/** Event logistics for the real invitation. Override per deployment with NEXT_PUBLIC_* variables. */
export const EVENT_DETAILS = {
  ceremony: {
    time: process.env.NEXT_PUBLIC_CEREMONY_TIME ?? '',
    venue: process.env.NEXT_PUBLIC_CEREMONY_VENUE ?? '',
    /** Optional exact Google Maps link; without it the venue text is searched on Maps. */
    mapsUrl: process.env.NEXT_PUBLIC_CEREMONY_MAPS_URL ?? '',
  },
  reception: {
    time: process.env.NEXT_PUBLIC_RECEPTION_TIME ?? '',
    venue: process.env.NEXT_PUBLIC_RECEPTION_VENUE ?? '',
    mapsUrl: process.env.NEXT_PUBLIC_RECEPTION_MAPS_URL ?? '',
  },
};

/** Shown on the invitation page, one name per line. */
export const PARENTS = {
  bride: ['Jose E. Taveras', 'Rosa Medina'],
  groom: ['Honorio A. García', 'Ingrid S. Martinez'],
};

/** Colour suggestions for the dress code, in the tones of the save-the-date photos. */
export const DRESS_PALETTE = [
  { hex: '#eadfc8', es: 'Arena', en: 'Sand' },
  { hex: '#cdb892', es: 'Beige', en: 'Beige' },
  { hex: '#a8936f', es: 'Caqui', en: 'Khaki' },
  { hex: '#9ca88c', es: 'Salvia', en: 'Sage' },
  { hex: '#d8b4a4', es: 'Rosa palo', en: 'Dusty rose' },
  { hex: '#7a5a43', es: 'Cacao', en: 'Cocoa' },
];

/** Start of the ceremony as a local Date, read from a time such as "4:00 P.M." or "16:00". Midnight if unreadable. */
export function ceremonyStart(): Date {
  const { y, m, d } = parseIso(WEDDING_DATE_ISO);
  const match = EVENT_DETAILS.ceremony.time.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?/i);
  let hour = 0;
  let minute = 0;
  if (match) {
    hour = Number(match[1]);
    minute = Number(match[2] ?? 0);
    const meridiem = match[3]?.toLowerCase();
    if (meridiem === 'p' && hour < 12) hour += 12;
    if (meridiem === 'a' && hour === 12) hour = 0;
  }
  return new Date(y, m - 1, d, hour, minute);
}

export const SHORT_CODE_PATTERN = /^[a-hj-km-np-z2-9]{6}$/;

export function buildPassUrl(siteUrl: string, shortCode: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/invitacion/${shortCode}`;
}

export function buildInvitationUrl(siteUrl: string, shortCode: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/i/${shortCode}`;
}

/** Digits only, with the country code WhatsApp requires. 10-digit numbers are treated as NANP (+1). */
export function toWhatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits.length >= 11 ? digits : null;
}

/**
 * Fills a message template. Placeholders: {nombre} (guest's first name), {enlace} (their short link),
 * {pareja} and {fecha}. `lang` is the language of the message, which sets the date format.
 */
export function renderInvitationMessage(
  template: string,
  name: string,
  link: string,
  lang: string
): string {
  return template
    .replaceAll('{nombre}', name)
    .replaceAll('{enlace}', link)
    .replaceAll('{pareja}', COUPLE_NAMES)
    .replaceAll('{fecha}', formatWeddingDateLong(lang));
}

export function buildWhatsappUrl(phone: string | null, message: string): string | null {
  const number = toWhatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ---- Save the date: formatting and "add to calendar" links ----

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** "sábado, 22 de mayo de 2027" — formatted in UTC so the day never shifts with the viewer's timezone. */
export function formatWeddingDate(locale: string): string {
  const { y, m, d } = parseIso(WEDDING_DATE_ISO);
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-DO' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "22 de mayo de 2027" / "May 22, 2027" — no weekday, for messages. */
export function formatWeddingDateLong(locale: string): string {
  const { y, m, d } = parseIso(WEDDING_DATE_ISO);
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-DO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

const compact = (iso: string) => iso.replaceAll('-', '');

/** All-day events end on the following day (exclusive end date). */
function nextDayIso(iso: string): string {
  const { y, m, d } = parseIso(iso);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export interface CalendarEvent {
  title: string;
  details: string;
}

export function buildGoogleCalendarUrl({ title, details }: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details,
    dates: `${compact(WEDDING_DATE_ISO)}/${compact(nextDayIso(WEDDING_DATE_ISO))}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl({ title, details }: CalendarEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    body: details,
    startdt: WEDDING_DATE_ISO,
    enddt: nextDayIso(WEDDING_DATE_ISO),
    allday: 'true',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

const escapeIcs = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** An .ics file (Apple Calendar, Outlook desktop, and most other apps) with a reminder a week before. */
export function buildIcs({ title, details }: CalendarEvent): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding List//Save the date//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:save-the-date-${compact(WEDDING_DATE_ISO)}@wedding-list`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(WEDDING_DATE_ISO)}`,
    `DTEND;VALUE=DATE:${compact(nextDayIso(WEDDING_DATE_ISO))}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(details)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(title)}`,
    'TRIGGER:-P7D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
