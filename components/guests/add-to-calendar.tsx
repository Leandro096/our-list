'use client';

import { CalendarPlus } from 'lucide-react';

import {
  buildIcs,
  COUPLE_NAMES,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
} from '@/lib/invitation';

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useTranslation } from '@/locales/i18n-provider';

/** Lets the guest put the wedding day in the calendar they already use. */
export function AddToCalendar() {
  const { t } = useTranslation();

  const event = () => ({
    title: t('invitations.page.calendar.title', { names: COUPLE_NAMES }),
    details: t('invitations.page.calendar.details', { link: window.location.href }),
  });

  const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(event())], { type: 'text/calendar;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'save-the-date.ics';
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/10 px-4 py-2 text-sm font-medium text-[var(--inv-paper)] backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--inv-gold)] data-[state=open]:bg-white/25"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          {t('invitations.page.calendar.button')}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuItem onSelect={() => openUrl(buildGoogleCalendarUrl(event()))}>
          {t('invitations.page.calendar.google')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openUrl(buildOutlookCalendarUrl(event()))}>
          {t('invitations.page.calendar.outlook')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={downloadIcs}>
          {t('invitations.page.calendar.ics')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
