'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, MessageCircle } from 'lucide-react';

import { MESSAGE_OPTIONS } from '@/lib/invitation-messages';
import { buildWhatsappUrl, buildInvitationUrl, renderInvitationMessage } from '@/lib/invitation';

import { toast } from '@/hooks';
import { markInvitationSentAction } from '@/app/dashboard/invitations/actions';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { useTranslation } from '@/locales/i18n-provider';

import { useMessageTemplates } from './use-message-templates';

export interface ShareGuest {
  id: string;
  first_name: string;
  phone: string | null;
  short_code: string;
  invitation_sent_at: string | null;
}

interface ShareMenuProps {
  guest: ShareGuest;
  /** `icon` is a compact button for table rows; `split` sends the default message in one click. */
  variant?: 'icon' | 'split';
  onSentChange?: (sentAt: string | null) => void;
}

/** Sends a guest their personal save-the-date link on WhatsApp, with a choice of messages. */
export function ShareMenu({ guest, variant = 'icon', onSentChange }: ShareMenuProps) {
  const { t } = useTranslation();
  const templates = useMessageTemplates();
  const [origin, setOrigin] = useState('');
  const [sentAt, setSentAt] = useState(guest.invitation_sent_at);
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setSentAt(guest.invitation_sent_at), [guest.invitation_sent_at]);

  const link = origin ? buildInvitationUrl(origin, guest.short_code) : '';
  const hasPhone = buildWhatsappUrl(guest.phone, '') !== null;

  const messageFor = (optionId: string) => {
    const option = templates.getOption(optionId);
    return renderInvitationMessage(option.body, guest.first_name, link, option.lang);
  };

  const markSent = async () => {
    const res = await markInvitationSentAction(guest.id, true);
    if (res.ok) {
      setSentAt(res.sentAt);
      onSentChange?.(res.sentAt);
    }
  };

  const copyText = async (text: string, notice: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: notice });
    } catch {
      toast({ title: t('invitations.errors.copyFailed'), variant: 'destructive' });
    }
  };

  const share = (optionId: string) => {
    if (!link) return;
    const message = messageFor(optionId);
    const url = buildWhatsappUrl(guest.phone, message);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      void markSent();
    } else {
      void copyText(message, t('invitations.actions.messageCopied'));
    }
  };

  const menu = (
    <DropdownMenuContent align="end" className="w-72">
      <DropdownMenuLabel className="font-normal text-muted-foreground">
        {hasPhone
          ? t('invitations.actions.pickMessage')
          : t('invitations.actions.pickMessageNoPhone')}
      </DropdownMenuLabel>
      {MESSAGE_OPTIONS.map((option) => (
        <DropdownMenuItem key={option.id} onSelect={() => share(option.id)}>
          <span className="flex-1">{t(`invitations.messages.${option.labelKey}`)}</span>
          {option.id === templates.defaultId && (
            <Check
              className="ml-2 h-4 w-4 text-primary"
              aria-label={t('invitations.actions.default')}
            />
          )}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => link && copyText(link, t('invitations.actions.linkCopied'))}
      >
        <Copy className="mr-2 h-4 w-4" />
        {t('invitations.actions.copyLink')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            title={t('invitations.actions.share')}
          >
            <MessageCircle className="h-4 w-4" />
            {sentAt && (
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
                aria-hidden
              />
            )}
            <span className="sr-only">
              {t('invitations.actions.share')}
              {sentAt ? ` (${t('invitations.sentShort')})` : ''}
            </span>
          </Button>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    );
  }

  return (
    <div className="inline-flex">
      <Button
        size="sm"
        variant={sentAt ? 'outline' : 'default'}
        className="rounded-r-none"
        onClick={() => share(templates.defaultId)}
        disabled={!link}
      >
        {hasPhone ? (
          <MessageCircle className="mr-1.5 h-4 w-4" />
        ) : (
          <Copy className="mr-1.5 h-4 w-4" />
        )}
        {hasPhone
          ? sentAt
            ? t('invitations.actions.resend')
            : t('invitations.actions.whatsapp')
          : t('invitations.actions.copyMessage')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant={sentAt ? 'outline' : 'default'}
            className="rounded-l-none border-l border-l-background/30 px-2"
            aria-label={t('invitations.actions.pickMessage')}
          >
            {copied ? <Check className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    </div>
  );
}
