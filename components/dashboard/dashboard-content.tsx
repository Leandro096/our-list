'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { ScanLine, ChevronRight } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';
import type { DashboardStats, RecentActivityItem } from '@/lib/types';
import { COUPLE_NAMES, WEDDING_DATE_ISO, formatWeddingDate } from '@/lib/invitation';

import { StoryTimeline } from './story-timeline';
import { useLocale, useTranslation } from '@/locales/i18n-provider';

/** Guests per category name, split by reception or ceremony only. */
export interface CategoryBreakdown {
  reception: Record<string, number>;
  ceremonyOnly: Record<string, number>;
}

interface DashboardContentProps {
  stats: DashboardStats;
  unsentInvitations: number;
  categoryBreakdown: CategoryBreakdown;
}

// ---- Helpers ----

const DAY_MS = 86_400_000;

// Ribbon order and look. Declined is hatched so the four states do not depend on hue alone.
const RIBBON: Array<{ status: string; fill: string }> = [
  { status: 'Confirmed', fill: 'var(--chart-1)' },
  { status: 'Tentative', fill: 'var(--chart-2)' },
  { status: 'Pending', fill: 'var(--chart-5)' },
  {
    status: 'Declined',
    fill: 'repeating-linear-gradient(135deg, var(--border) 0 3px, transparent 3px 6px)',
  },
];

function percentOf(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function weddingUtc() {
  const [y, m, d] = WEDDING_DATE_ISO.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Current time, floored to the minute. Null on the server so the page never hydrates a stale clock. */
function useNow() {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 15_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null
  );
}

const WEDDING_TIME_ZONE = 'America/Santo_Domingo';

/**
 * The calendar date and time of day in the Dominican Republic, whatever the viewer's time zone.
 * `today` is that date as a UTC midnight timestamp, comparable with the wedding date.
 */
function dominicanClock(now: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: WEDDING_TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)])
  );
  return {
    today: Date.UTC(parts.year, parts.month - 1, parts.day),
    msIntoDay: (parts.hour * 60 + parts.minute) * 60_000,
  };
}

/**
 * The countdown speaks in smaller units as the day gets closer:
 * months and days, then weeks and days, then days, then tomorrow, then today.
 */
function describeRemaining(
  total: number,
  today: number,
  wedding: number,
  localeTag: string,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (total < 0) return t('homeTodo.daysAgo', { count: Math.abs(total) });
  if (total === 0) return t('homeTodo.today');
  if (total === 1) return t('homeTodo.tomorrow');

  const unit = (n: number, name: 'month' | 'week' | 'day') =>
    new Intl.NumberFormat(localeTag, { style: 'unit', unit: name, unitDisplay: 'long' }).format(n);

  // Whole calendar months between today and the wedding, then the days left over.
  const from = new Date(today);
  let months =
    (new Date(wedding).getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (new Date(wedding).getUTCMonth() - from.getUTCMonth());
  const monthsFromToday = (m: number) =>
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + m, from.getUTCDate());
  if (monthsFromToday(months) > wedding) months -= 1;

  const parts: Array<{ n: number; text: string }> = [];
  if (months >= 1) {
    const days = Math.round((wedding - monthsFromToday(months)) / DAY_MS);
    parts.push({ n: months, text: unit(months, 'month') });
    if (days > 0) parts.push({ n: days, text: unit(days, 'day') });
  } else if (total >= 7) {
    parts.push({ n: Math.floor(total / 7), text: unit(Math.floor(total / 7), 'week') });
    if (total % 7 > 0) parts.push({ n: total % 7, text: unit(total % 7, 'day') });
  } else {
    parts.push({ n: total, text: unit(total, 'day') });
  }

  const list = new Intl.ListFormat(localeTag, { type: 'conjunction' }).format(
    parts.map((p) => p.text)
  );
  const singular = parts.length === 1 && parts[0].n === 1;
  return t(singular ? 'homeTodo.remainingSingular' : 'homeTodo.remainingPlural', { list });
}

function Heading({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-2xl">{children}</h2>
      {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}

// ---- Countdown and the month ruler ----

function Countdown({ now, localeTag }: { now: number | null; localeTag: string }) {
  const { t } = useTranslation();
  const wedding = weddingUtc();

  if (now === null) return <div className="h-24" aria-hidden />;

  const { today, msIntoDay } = dominicanClock(now);

  const total = Math.round((wedding - today) / DAY_MS);
  const headline = describeRemaining(total, today, wedding, localeTag, t);

  // The day before, the countdown also counts the hours left until the day changes in the Dominican Republic.
  const msLeft = wedding - today - msIntoDay;
  let hoursLine: string | null = null;
  if (total === 1 && msLeft > 0) {
    const hours = Math.floor(msLeft / 3_600_000);
    const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
    const unit = (n: number, name: 'hour' | 'minute') =>
      new Intl.NumberFormat(localeTag, { style: 'unit', unit: name, unitDisplay: 'long' }).format(
        n
      );
    const parts = [
      ...(hours > 0 ? [{ n: hours, text: unit(hours, 'hour') }] : []),
      ...(minutes > 0 || hours === 0 ? [{ n: minutes, text: unit(minutes, 'minute') }] : []),
    ];
    const list = new Intl.ListFormat(localeTag, { type: 'conjunction' }).format(
      parts.map((p) => p.text)
    );
    hoursLine = t(
      parts.length === 1 && parts[0].n === 1
        ? 'homeTodo.remainingSingular'
        : 'homeTodo.remainingPlural',
      { list }
    );
  }

  if (total <= 0) {
    return <p className="font-serif text-3xl">{headline}</p>;
  }

  return (
    <div>
      <p className="font-serif text-3xl">{headline}</p>
      {hoursLine && <p className="mt-1 text-lg text-muted-foreground">{hoursLine}</p>}
      <StoryTimeline today={today} localeTag={localeTag} />
    </div>
  );
}

// ---- Page ----

export function DashboardContent({
  stats,
  unsentInvitations,
  categoryBreakdown,
}: DashboardContentProps) {
  const [categoryTab, setCategoryTab] = useState<keyof CategoryBreakdown>('reception');
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'es' ? esLocale : undefined;
  const localeTag = locale === 'es' ? 'es-DO' : 'en-US';
  const now = useNow();

  const counts = new Map(stats.guestsByStatus.map((s) => [s.status, s.count]));
  const ribbonTotal = RIBBON.reduce((sum, r) => sum + (counts.get(r.status) ?? 0), 0);

  const noGuests = t('dashboard.noGuestsYet');
  const noConfirmed = t('dashboard.noConfirmedGuests');
  const ofGuests = (n: number) =>
    stats.totalGuests > 0
      ? t('dashboard.percentConfirmed', { percent: percentOf(n, stats.totalGuests) })
      : noGuests;
  const ofConfirmed = (n: number) =>
    stats.confirmedGuests > 0
      ? t('dashboard.percentOfConfirmed', { percent: percentOf(n, stats.confirmedGuests) })
      : noConfirmed;

  const tasks = [
    {
      href: '/dashboard/invitations',
      count: unsentInvitations,
      label: t('homeTodo.unsentLabel'),
    },
    {
      href: '/dashboard/guests?status=pending',
      count: stats.pendingGuests,
      label: t('homeTodo.awaitingLabel'),
    },
  ].filter((task) => task.count > 0);

  const categories = stats.guestsByCategory
    .map((c) => ({ ...c, count: categoryBreakdown[categoryTab][c.name] ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const maxCategory = Math.max(1, ...categories.map((c) => c.count));

  return (
    <div className="space-y-16">
      {/* The wedding itself: names, date, and how far away it is */}
      <header className="space-y-8">
        <div>
          <h1 className="font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
            {COUPLE_NAMES}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground first-letter:uppercase">
            {formatWeddingDate(locale)}
          </p>
        </div>
        <Countdown now={now} localeTag={localeTag} />
      </header>

      <div className="grid gap-x-20 gap-y-14 lg:grid-cols-[1.1fr_1fr]">
        {/* What to do next */}
        <section>
          <Heading note={t('homeTodo.todoDescription')}>{t('homeTodo.todoTitle')}</Heading>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground">{t('homeTodo.allDone')}</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {tasks.map((task) => (
                <li key={task.href}>
                  <Link
                    href={task.href}
                    className="group flex items-center gap-5 py-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="w-20 shrink-0 font-serif text-5xl tabular-nums leading-none">
                      {task.count}
                    </span>
                    <span className="flex-1">{task.label}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Who is coming */}
        <section aria-label={t('homeTodo.comingTitle')}>
          <Heading>{t('homeTodo.comingTitle')}</Heading>
          <p className="font-serif leading-none">
            <span className="text-6xl tabular-nums">{stats.confirmedGuests}</span>
            <span className="ml-3 text-2xl text-muted-foreground tabular-nums">
              / {stats.totalGuests}
            </span>
          </p>

          <div
            role="img"
            aria-label={RIBBON.map(
              (r) =>
                `${t(`guests.statuses.${r.status.toLowerCase()}`)}: ${counts.get(r.status) ?? 0}`
            ).join(', ')}
            className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted"
          >
            {RIBBON.map((r) => {
              const count = counts.get(r.status) ?? 0;
              if (count === 0 || ribbonTotal === 0) return null;
              return (
                <div
                  key={r.status}
                  className="ribbon-segment h-full"
                  style={{ width: `${(count / ribbonTotal) * 100}%`, background: r.fill }}
                />
              );
            })}
          </div>

          <ul className="mt-4 divide-y divide-border text-sm">
            {RIBBON.map((r) => {
              const count = counts.get(r.status) ?? 0;
              return (
                <li key={r.status} className="flex items-center gap-3 py-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full border border-border"
                    style={{ background: r.fill }}
                  />
                  <span className="flex-1">{t(`guests.statuses.${r.status.toLowerCase()}`)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {percentOf(count, ribbonTotal)}%
                  </span>
                  <span className="w-10 text-right tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Ceremony and reception side by side */}
      <section className="grid gap-x-16 gap-y-10 md:grid-cols-2">
        {[
          {
            label: t('dashboard.justCeremony'),
            invited: stats.justCeremony,
            checkedLabel: t('dashboard.ceremonyCheckIns'),
            checked: stats.checkedInCeremony,
          },
          {
            label: t('dashboard.justReception'),
            invited: stats.justReception,
            checkedLabel: t('dashboard.receptionCheckIns'),
            checked: stats.checkedInReception,
          },
        ].map((col) => (
          <div key={col.label} className="space-y-6 py-2">
            <div>
              <p className="text-muted-foreground">{col.label}</p>
              <p className="mt-1 flex items-baseline gap-3">
                <span className="font-serif text-6xl tabular-nums leading-none">{col.invited}</span>
                <span className="text-sm text-muted-foreground">{ofGuests(col.invited)}</span>
              </p>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3 text-sm">
              <span>{col.checkedLabel}</span>
              <span className="text-muted-foreground">{ofConfirmed(col.checked)}</span>
              <span className="font-serif text-2xl tabular-nums">{col.checked}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-x-20 gap-y-14 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <Heading note={t('dashboard.guestsByCategoryDesc')}>
            {t('dashboard.guestsByCategory')}
          </Heading>
          <div
            role="tablist"
            className="mb-5 flex gap-5 overflow-x-auto overflow-y-hidden border-b border-border"
          >
            {(['reception', 'ceremonyOnly'] as const).map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={categoryTab === key}
                onClick={() => setCategoryTab(key)}
                className={cn(
                  'relative -mb-px whitespace-nowrap border-b-2 border-transparent px-0.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  categoryTab === key
                    ? 'border-gold font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(key === 'reception' ? 'homeTodo.catReception' : 'homeTodo.catCeremonyOnly')}
              </button>
            ))}
          </div>
          <ul className="space-y-3">
            {categories.map((cat) => (
              <li
                key={cat.name ?? cat.color}
                className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-chart-2"
                    style={{ width: `${(cat.count / maxCategory) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{cat.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <Heading note={t('dashboard.latestActivity')}>{t('dashboard.recentActivity')}</Heading>
          {stats.recentActivity.length === 0 ? (
            <p className="text-muted-foreground">{t('homeTodo.noActivity')}</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {stats.recentActivity.map((scan: RecentActivityItem) => (
                <li key={scan.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ScanLine
                      aria-hidden
                      className={cn(
                        'h-4 w-4 shrink-0',
                        scan.is_duplicate ? 'text-destructive' : 'text-sage'
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {scan.guests?.first_name} {scan.guests?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scan.event_type === 'ceremony'
                          ? t('scanner.ceremony')
                          : t('scanner.reception')}
                        {scan.is_duplicate && ` (${t('dashboard.duplicate')})`}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(scan.scanned_at), {
                      addSuffix: true,
                      locale: dateFnsLocale,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
