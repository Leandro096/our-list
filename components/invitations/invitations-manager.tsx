'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, Undo2, Search, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';
import { joinNames, MESSAGE_OPTIONS } from '@/lib/invitation-messages';
import { buildInvitationUrl, renderInvitationMessage } from '@/lib/invitation';

import { toast } from '@/hooks';
import { markInvitationSentAction } from '@/app/dashboard/invitations/actions';

import {
  Input,
  Button,
  Select,
  Textarea,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui';

import { useLocale, useTranslation } from '@/locales/i18n-provider';

import { ShareMenu } from './share-menu';
import { useMessageTemplates } from './use-message-templates';

export interface InvitationRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  members: string[];
  short_code: string;
  invitation_sent_at: string | null;
  status: string;
  family: number;
}

type Filter = 'todo' | 'sent' | 'all';

export function InvitationsManager({
  guests,
  siteUrl,
}: {
  guests: InvitationRow[];
  siteUrl: string;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const templates = useMessageTemplates();
  const [rows, setRows] = useState(guests);
  const [filter, setFilter] = useState<Filter>('todo');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [plural, setPlural] = useState(false);
  const [, startTransition] = useTransition();

  const current = templates.getOption(templates.defaultId, plural);
  const sample = rows[0];
  const sampleNames = joinNames(
    [sample?.first_name ?? 'María', ...(plural ? [t('invitations.message.sampleMember')] : [])],
    current.lang
  );
  const preview = renderInvitationMessage(
    current.body,
    sampleNames,
    buildInvitationUrl(siteUrl, sample?.short_code ?? 'abc234'),
    current.lang
  );

  const sentCount = rows.filter((r) => r.invitation_sent_at).length;
  const pct = rows.length === 0 ? 0 : Math.round((sentCount / rows.length) * 100);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'todo' && r.invitation_sent_at) return false;
      if (filter === 'sent' && !r.invitation_sent_at) return false;
      if (!q) return true;
      return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q);
    });
  }, [rows, filter, query]);

  const setSent = (id: string, sentAt: string | null) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, invitation_sent_at: sentAt } : r)));

  const undoSent = (row: InvitationRow) => {
    const previous = row.invitation_sent_at;
    setSent(row.id, null);
    startTransition(async () => {
      const res = await markInvitationSentAction(row.id, false);
      if (!res.ok) {
        setSent(row.id, previous);
        toast({
          title: t('invitations.errors.saveFailed'),
          description: t('invitations.errors.saveFailedHint'),
          variant: 'destructive',
        });
      }
    });
  };

  const sentFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'es' ? 'es-DO' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [locale]
  );

  const filters: Array<{ id: Filter; count: number }> = [
    { id: 'todo', count: rows.length - sentCount },
    { id: 'sent', count: sentCount },
    { id: 'all', count: rows.length },
  ];

  return (
    <div className="space-y-5">
      <section aria-label={t('invitations.progress.label')} className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-serif text-3xl">
            {t('invitations.progress.summary', { sent: sentCount, total: rows.length })}
          </p>
          <span className="text-sm tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={sentCount}
          aria-valuemin={0}
          aria-valuemax={rows.length}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">{t('invitations.message.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('invitations.message.help')}</p>
          </div>
          <Select value={templates.defaultId} onValueChange={templates.setDefaultId}>
            <SelectTrigger className="w-full sm:w-72" aria-label={t('invitations.message.title')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {t(`invitations.messages.${option.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div role="tablist" className="inline-flex gap-5 border-b border-border">
          {[false, true].map((isPlural) => (
            <button
              key={String(isPlural)}
              role="tab"
              aria-selected={plural === isPlural}
              onClick={() => setPlural(isPlural)}
              className={cn(
                'relative -mb-px border-b-2 border-transparent px-0.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                plural === isPlural
                  ? 'border-gold font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(isPlural ? 'invitations.message.several' : 'invitations.message.single')}
            </button>
          ))}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={current.body}
              onChange={(e) => templates.setBody(current.id, plural, e.target.value)}
              rows={12}
              aria-label={t('invitations.message.title')}
            />
            <p className="text-xs text-muted-foreground">{t('invitations.message.hint')}</p>
          </div>
        ) : (
          <p className="whitespace-pre-line rounded-md bg-muted/60 p-3 text-sm leading-relaxed">
            {preview}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? t('invitations.message.done') : t('invitations.message.edit')}
          </Button>
          {templates.isEdited(current.id, plural) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => templates.resetBody(current.id, plural)}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t('invitations.message.reset')}
            </Button>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" className="inline-flex gap-5 border-b border-border">
          {filters.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'relative -mb-px border-b-2 border-transparent px-0.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                filter === f.id
                  ? 'border-gold font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(`invitations.filters.${f.id}`)}
              <span className="ml-1.5 tabular-nums text-muted-foreground">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('invitations.search')}
            className="pl-9"
            aria-label={t('invitations.search')}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          {filter === 'todo' && !query
            ? t('invitations.empty.allSent')
            : t('invitations.empty.none')}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {visible.map((row) => {
            const sent = row.invitation_sent_at;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-x-2 font-medium">
                    {row.first_name} {row.last_name}
                    {row.family > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {t('invitations.family', { count: row.family })}
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatPhone(row.phone) || row.phone || t('invitations.noPhone')}
                  </p>
                  {sent && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-sage" />
                      {t('invitations.sentAt', { date: sentFormatter.format(new Date(sent)) })}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {sent && (
                    <Button variant="ghost" size="sm" onClick={() => undoSent(row)}>
                      <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                      {t('invitations.actions.undo')}
                    </Button>
                  )}
                  <ShareMenu
                    guest={row}
                    variant="split"
                    onSentChange={(sentAt) => setSent(row.id, sentAt)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
