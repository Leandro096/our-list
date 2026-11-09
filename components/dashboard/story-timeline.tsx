'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { WEDDING_DATE_ISO } from '@/lib/invitation';
import { useTranslation } from '@/locales/i18n-provider';

interface Milestone {
  from: string;
  to?: string;
}

// The i18n key for each entry is homeTodo.story01, story02... in this order. The wedding is last.
const MILESTONES: Milestone[] = [
  { from: '2022-07-16' },
  { from: '2022-08-12' },
  { from: '2022-08-20' },
  { from: '2022-09-11' },
  { from: '2022-09-17' },
  { from: '2022-09-24' },
  { from: '2022-10-02' },
  { from: '2022-11-03' },
  { from: '2022-11-11' },
  { from: '2022-12-09' },
  { from: '2023-01-27' },
  { from: '2023-02-03' },
  { from: '2024-04-19', to: '2024-04-21' },
  { from: '2024-05-04' },
  { from: '2024-10-11' },
  { from: '2024-12-12' },
  { from: '2025-02-23' },
  { from: '2026-04-24' },
  { from: '2026-04-29', to: '2026-05-03' },
  { from: '2027-03-07' },
  { from: WEDDING_DATE_ISO },
];

const utc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Relative distance in the largest whole unit: years, months or days. */
function relative(from: number, today: number, localeTag: string) {
  const rtf = new Intl.RelativeTimeFormat(localeTag, { numeric: 'auto' });
  const a = new Date(Math.min(from, today));
  const b = new Date(Math.max(from, today));
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth()) -
    (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
  const sign = from > today ? 1 : -1;
  if (months >= 12) return rtf.format(sign * Math.floor(months / 12), 'year');
  if (months >= 1) return rtf.format(sign * months, 'month');
  return rtf.format(sign * Math.round(Math.abs(from - today) / 86_400_000), 'day');
}

export function StoryTimeline({ today, localeTag }: { today: number; localeTag: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const fmt = new Intl.DateTimeFormat(localeTag, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const fmtDay = new Intl.DateTimeFormat(localeTag, { day: 'numeric', timeZone: 'UTC' });
  const fmtDayMonth = new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const items = MILESTONES.map((m, i) => {
    const start = utc(m.from);
    const end = m.to ? utc(m.to) : start;
    return {
      key: `homeTodo.story${String(i + 1).padStart(2, '0')}`,
      start,
      isWedding: i === MILESTONES.length - 1,
      label: m.to
        ? t('homeTodo.storyRange', {
            from: (new Date(start).getUTCMonth() === new Date(end).getUTCMonth() ? fmtDay : fmtDayMonth).format(start),
            to: fmt.format(end),
          })
        : fmt.format(start),
      past: end < today,
    };
  });
  const firstFuture = items.findIndex((i) => !i.past);

  // The ruler runs from the first date to the wedding; time is linear, so every year has the same width.
  const minMs = items[0].start;
  const maxMs = items[items.length - 1].start;
  const firstYear = new Date(minMs).getUTCFullYear();
  const lastYear = new Date(maxMs).getUTCFullYear();
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, k) => firstYear + k);
  const posOfDate = (ms: number) => ((ms - minMs) / (maxMs - minMs)) * 100;
  const todayPos = Math.min(100, Math.max(0, posOfDate(today)));

  // Dates that fall too close together share one marker and one hover.
  const CLUSTER_GAP = 2.5;
  const clusters: Array<{ pos: number; entries: typeof items }> = [];
  for (const item of items) {
    const pos = posOfDate(item.start);
    const last = clusters[clusters.length - 1];
    if (last && !item.isWedding && pos - last.pos <= CLUSTER_GAP) last.entries.push(item);
    else clusters.push({ pos, entries: [item] });
  }

  return (
    <div>
      <div className="relative mt-6 h-20 select-none">
        <div className="absolute inset-x-0 top-3 h-px bg-foreground/25" />
        <div
          className="absolute left-0 top-3 h-px bg-foreground/60"
          style={{ width: `${todayPos}%` }}
        />
        {years.map((y, k) => (
          <div
            key={y}
            className="absolute top-3"
            style={{ left: `${k === 0 ? 0 : posOfDate(Date.UTC(y, 0, 1))}%` }}
            aria-hidden
          >
            <span className="block h-2 w-px bg-foreground/40" />
            <span className="mt-1.5 block text-xs text-muted-foreground">{y}</span>
          </div>
        ))}
        {clusters.map((cluster) => {
          const { pos, entries } = cluster;
          const first = entries[0];
          const wedding = first.isWedding;
          const past = entries.every((e) => e.past);
          const edge = pos < 15 ? 'left-0' : pos > 85 ? 'right-0' : 'left-1/2 -translate-x-1/2';
          return (
            <div
              key={first.key}
              className="group absolute top-3 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos}%` }}
            >
              <button
                type="button"
                aria-label={entries.map((e) => `${e.label}: ${t(e.key)}`).join('. ')}
                className="flex h-6 w-5 items-center justify-center focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    'block rounded-full transition-transform group-hover:scale-125 group-focus-within:scale-125',
                    wedding
                      ? 'h-3.5 w-3.5 bg-gold ring-4 ring-gold/20'
                      : entries.length > 1
                        ? 'h-3 w-3 ring-2 ring-foreground/30'
                        : 'h-2 w-2',
                    !wedding &&
                      (past ? 'bg-foreground' : 'border border-foreground/60 bg-background')
                  )}
                />
              </button>
              <div
                role="tooltip"
                className={cn(
                  'pointer-events-none invisible absolute top-full z-20 mt-10 w-72 max-w-[calc(100vw-2rem)] space-y-3 rounded-md border border-border bg-popover p-3 text-left text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100',
                  edge
                )}
              >
                {entries.map((e) => (
                  <div key={e.key}>
                    <p className="text-xs text-muted-foreground">
                      {e.label} · {relative(e.start, today, localeTag)}
                    </p>
                    <p className={cn('mt-0.5 text-sm', e.isWedding && 'font-serif text-base')}>
                      {t(e.key)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div
          className="absolute top-3 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${todayPos}%` }}
          aria-hidden
        >
          <span className="block h-4 w-0.5 bg-primary" />
          <span className="absolute left-1/2 top-full mt-6 -translate-x-1/2 text-xs font-medium">
            {t('homeTodo.todayMarker')}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        {t(open ? 'homeTodo.storyHide' : 'homeTodo.storyShow')}
      </button>

      {open && (
        <ol className="relative mb-2 ml-1.5 mt-6 border-l border-border">
          {items.map((item, i) => (
            <li key={item.key} className="relative pb-5 pl-7 last:pb-0">
              {i === firstFuture && (
                <div className="-ml-7 mb-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="h-px w-5 bg-foreground/50" />
                  {t('homeTodo.todayMarker')}
                </div>
              )}
              <span
                className={cn(
                  'absolute -left-[5px] block rounded-full',
                  i === firstFuture ? 'top-[3.1rem]' : 'top-1.5',
                  item.isWedding
                    ? '-left-[7px] h-3.5 w-3.5 bg-gold ring-4 ring-gold/20'
                    : item.past
                      ? 'h-2.5 w-2.5 bg-foreground'
                      : 'h-2.5 w-2.5 border border-foreground/60 bg-background'
                )}
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">
                {item.label} · {relative(item.start, today, localeTag)}
              </p>
              <p className={cn('mt-0.5', item.isWedding ? 'font-serif text-2xl' : 'text-base')}>
                {t(item.key)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
