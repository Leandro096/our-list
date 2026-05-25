'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Pencil,
  QrCode,
  Mail,
  Phone,
  UtensilsCrossed,
  StickyNote,
  Armchair,
  ScanLine,
  Users,
  Link2,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import type { Category } from '@/lib/types';
import { useTranslation } from '@/locales/i18n-provider';
import { useLocale } from '@/locales/i18n-provider';

interface GuestDetailProps {
  guest: {
    id: string;
    invitation_guid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    status: 'pending' | 'confirmed' | 'declined' | 'tentative';
    dietary_restrictions: string | null;
    notes: string | null;
    is_plus_one: boolean;
    created_at: string;
    updated_at: string;
    guest_categories: Array<{
      category_id: string;
      categories: Pick<Category, 'id' | 'name' | 'color'>;
    }>;
    event_attendance: Array<{
      event_type: string;
      attending: boolean | null;
    }>;
    seating_assignments: Array<{
      tables: { number: string } | null;
    }>;
    scan_logs: Array<{
      id: string;
      scanned_at: string;
      event_type: string;
      is_duplicate: boolean;
      users: { display_name: string };
    }>;
    family_role?: 'parent' | 'child';
    children?: Array<{
      id: string;
      first_name: string;
      last_name: string;
      status: 'pending' | 'confirmed' | 'declined' | 'tentative';
      is_plus_one: boolean;
    }>;
    parent?: {
      id: string;
      first_name: string;
      last_name: string;
      status: 'pending' | 'confirmed' | 'declined' | 'tentative';
      is_plus_one: boolean;
    } | null;
    siblings?: Array<{
      id: string;
      first_name: string;
      last_name: string;
      status: 'pending' | 'confirmed' | 'declined' | 'tentative';
      is_plus_one: boolean;
    }>;
  };
}

const statusVariants = {
  pending: 'outline' as const,
  confirmed: 'default' as const,
  declined: 'secondary' as const,
  tentative: 'outline' as const,
};

export function GuestDetail({ guest }: GuestDetailProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'es' ? esLocale : undefined;
  const seating = guest.seating_assignments?.[0];
  const ceremonyAttendance = guest.event_attendance?.find((ea) => ea.event_type === 'ceremony');
  const receptionAttendance = guest.event_attendance?.find((ea) => ea.event_type === 'reception');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/guests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('guests.backToGuests')}
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/guests/${guest.id}/qr`}>
              <QrCode className="mr-2 h-4 w-4" />
              {t('guests.qrCode')}
            </Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href={`/dashboard/guests/${guest.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-serif text-2xl">
                    {guest.first_name} {guest.last_name}
                  </CardTitle>
                  {guest.is_plus_one && (
                    <span className="text-sm text-muted-foreground">{t('guests.plusOne')}</span>
                  )}
                </div>
                <Badge variant={statusVariants[guest.status]}>
                  {t(`guests.statuses.${guest.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {guest.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${guest.email}`} className="hover:underline">
                    {guest.email}
                  </a>
                </div>
              )}
              {guest.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${guest.phone}`} className="hover:underline">
                    {guest.phone}
                  </a>
                </div>
              )}
              {guest.dietary_restrictions && (
                <div className="flex items-start gap-3 text-sm">
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  <span>{guest.dietary_restrictions}</span>
                </div>
              )}
              {guest.notes && (
                <div className="flex items-start gap-3 text-sm">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  <span>{guest.notes}</span>
                </div>
              )}
              {seating && (
                <div className="flex items-center gap-3 text-sm">
                  <Armchair className="h-4 w-4 text-muted-foreground" />
                  <span>{t('scanner.tableNumber', { number: seating.tables?.number ?? '' })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>{t('guests.eventAttendance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium">{t('scanner.ceremony')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {ceremonyAttendance?.attending === true
                      ? t('guests.attending')
                      : ceremonyAttendance?.attending === false
                        ? t('guests.notAttending')
                        : t('guests.awaitingResponse')}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium">{t('scanner.reception')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {receptionAttendance?.attending === true
                      ? t('guests.attending')
                      : receptionAttendance?.attending === false
                        ? t('guests.notAttending')
                        : t('guests.awaitingResponse')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan History */}
          <Card>
            <CardHeader>
              <CardTitle>{t('guests.checkInHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {guest.scan_logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('guests.noCheckIns')}</p>
              ) : (
                <div className="space-y-3">
                  {guest.scan_logs.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            scan.is_duplicate ? 'bg-destructive/10' : 'bg-sage/20'
                          }`}
                        >
                          <ScanLine
                            className={`h-4 w-4 ${
                              scan.is_duplicate ? 'text-destructive' : 'text-sage'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {scan.event_type === 'ceremony'
                              ? t('scanner.ceremony')
                              : t('scanner.reception')}
                            {scan.is_duplicate && ` (${t('dashboard.duplicate')})`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('dashboard.scannedBy', {
                              name: scan.users?.display_name || t('common.unknown'),
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{format(new Date(scan.scanned_at), 'MMM d, yyyy')}</p>
                        <p>{format(new Date(scan.scanned_at), 'h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>{t('nav.categories')}</CardTitle>
            </CardHeader>
            <CardContent>
              {guest.guest_categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('guests.noCategoriesAssigned')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {guest.guest_categories.map((gc) => (
                    <Badge
                      key={gc.category_id}
                      variant="outline"
                      style={{
                        borderColor: gc.categories.color,
                        color: gc.categories.color,
                      }}
                    >
                      {gc.categories.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>{t('guests.guestDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t('guests.invitationId')}</p>
                <p className="font-mono text-xs">{guest.invitation_guid}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('guests.added')}</p>
                <p>
                  {formatDistanceToNow(new Date(guest.created_at), {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('common.lastUpdated')}</p>
                <p>
                  {formatDistanceToNow(new Date(guest.updated_at), {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Family / Related Guests */}
          {guest.family_role && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('guests.related')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Parent (if this guest is a child) */}
                {guest.family_role === 'child' && guest.parent && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t('guests.parentLabel')}
                    </p>
                    <Link
                      href={`/dashboard/guests/${guest.parent.id}`}
                      className="flex items-center gap-2 rounded-md p-2 hover:bg-muted transition-colors"
                    >
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium">
                        {guest.parent.first_name} {guest.parent.last_name}
                      </span>
                      <Badge variant={statusVariants[guest.parent.status]} className="ml-auto text-xs">
                        {t(`guests.statuses.${guest.parent.status}`)}
                      </Badge>
                    </Link>
                  </div>
                )}

                {/* Children (if this guest is a parent) */}
                {guest.family_role === 'parent' && (guest.children?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t('guests.memberCount', { count: guest.children!.length })}
                    </p>
                    <div className="space-y-1">
                      {guest.children!.map((child) => (
                        <Link
                          key={child.id}
                          href={`/dashboard/guests/${child.id}`}
                          className="flex items-center gap-2 rounded-md p-2 hover:bg-muted transition-colors"
                        >
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {child.first_name} {child.last_name}
                            {child.is_plus_one && (
                              <span className="ml-1 text-xs text-muted-foreground">+1</span>
                            )}
                          </span>
                          <Badge variant={statusVariants[child.status]} className="ml-auto text-xs">
                            {t(`guests.statuses.${child.status}`)}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Siblings (if this guest is a child) */}
                {guest.family_role === 'child' && (guest.siblings?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t('guests.siblings')}
                    </p>
                    <div className="space-y-1">
                      {guest.siblings!.map((sibling) => (
                        <Link
                          key={sibling.id}
                          href={`/dashboard/guests/${sibling.id}`}
                          className="flex items-center gap-2 rounded-md p-2 hover:bg-muted transition-colors"
                        >
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {sibling.first_name} {sibling.last_name}
                            {sibling.is_plus_one && (
                              <span className="ml-1 text-xs text-muted-foreground">+1</span>
                            )}
                          </span>
                          <Badge variant={statusVariants[sibling.status]} className="ml-auto text-xs">
                            {t(`guests.statuses.${sibling.status}`)}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No family data */}
                {guest.family_role === 'parent' && (guest.children?.length ?? 0) === 0 && (
                  <p className="text-muted-foreground">{t('guests.noRelated')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
