'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { useI18n } from '@/locales';
import {
  submitPublicRsvp,
  getPublicRsvpDetails,
  type PublicRsvpErrorCode,
  searchGuestsForPublicRsvp,
} from '@/app/rsvp/actions';

import {
  Card,
  Badge,
  Input,
  Label,
  Button,
  Textarea,
  CardTitle,
  CardHeader,
  RadioGroup,
  CardContent,
  RadioGroupItem,
  CardDescription,
} from '@/components/ui';

type PublicGuest = {
  invitation_guid: string;
  first_name: string;
  last_name: string;
  invited_events: Array<'ceremony' | 'reception' | 'both'>;
};

type EditableRsvpMember = {
  id: string;
  first_name: string;
  last_name: string;
  status: 'pending' | 'confirmed' | 'tentative' | 'declined';
  email: string | null;
  phone: string | null;
  dietary_restrictions: string | null;
  invited_events: Array<'ceremony' | 'reception' | 'both'>;
};

type EditableRsvpProfile = {
  guest: EditableRsvpMember;
  family_role: 'parent' | 'child';
  related: EditableRsvpMember[];
  can_add_plus_one: boolean;
};

type RsvpStatus = 'confirmed' | 'tentative' | 'declined';

export function PublicRsvpFlow() {
  const { t, locale } = useI18n();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PublicGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<PublicGuest | null>(null);
  const [status, setStatus] = useState<RsvpStatus>('confirmed');
  const [profile, setProfile] = useState<EditableRsvpProfile | null>(null);
  const [addPlusOne, setAddPlusOne] = useState(false);
  const [plusOneDraft, setPlusOneDraft] = useState<{
    first_name: string;
    last_name: string;
    status: RsvpStatus;
    email: string;
    phone: string;
    dietary_restrictions: string;
  }>({
    first_name: '',
    last_name: '',
    status: 'tentative',
    email: '',
    phone: '',
    dietary_restrictions: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    guestName: string;
    status: RsvpStatus;
    confirmedAt: string;
    invitedEvents: Array<'ceremony' | 'reception' | 'both'>;
    decisionCounts: Record<RsvpStatus, number>;
  } | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isLoadingProfile, startProfileLoad] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const statusLabel = (value: RsvpStatus) => t(`rsvp.statuses.${value}`);

  const formatInvitedEvents = (events: Array<'ceremony' | 'reception' | 'both'>): string => {
    if (events.length === 0) return t('rsvp.events.main');
    if (events.includes('both')) return t('rsvp.events.both');

    return events.map((event) => t(`rsvp.events.${event}`)).join(', ');
  };

  const getErrorMessage = (code: PublicRsvpErrorCode): string => {
    switch (code) {
      case 'invalid_invitation':
        return t('rsvp.errors.invalidInvitation');
      case 'invitation_not_found':
        return t('rsvp.errors.invitationNotFound');
      case 'save_failed':
        return t('rsvp.errors.saveFailed');
      default:
        return t('rsvp.errors.generic');
    }
  };

  const handleSearch = () => {
    setError(null);
    setSuccess(null);

    if (term.trim().length < 3) {
      setResults([]);
      setError(t('rsvp.errors.minSearchChars'));
      return;
    }

    startSearch(async () => {
      const rows = await searchGuestsForPublicRsvp(term);
      setResults(rows);
      if (rows.length === 0) {
        setError(t('rsvp.errors.noMatches'));
      }
    });
  };

  const handleSubmit = () => {
    if (!selectedGuest || !profile) {
      setError(t('rsvp.errors.selectGuestFirst'));
      return;
    }

    if (addPlusOne && (!plusOneDraft.first_name.trim() || !plusOneDraft.last_name.trim())) {
      setError(t('rsvp.errors.plusOneNameRequired'));
      return;
    }

    setError(null);
    setSuccess(null);

    startSubmit(async () => {
      const res = await submitPublicRsvp({
        invitationGuid: selectedGuest.invitation_guid,
        status,
        email: profile.guest.email ?? '',
        phone: profile.guest.phone ?? '',
        dietaryRestrictions: profile.guest.dietary_restrictions ?? '',
        related:
          profile.family_role === 'parent'
            ? profile.related.map((relative) => ({
                id: relative.id,
                status: relative.status === 'pending' ? 'tentative' : relative.status,
                email: relative.email ?? '',
                phone: relative.phone ?? '',
                dietaryRestrictions: relative.dietary_restrictions ?? '',
              }))
            : [],
        plusOne:
          addPlusOne && profile.can_add_plus_one
            ? {
                firstName: plusOneDraft.first_name,
                lastName: plusOneDraft.last_name,
                status: plusOneDraft.status,
                email: plusOneDraft.email,
                phone: plusOneDraft.phone,
                dietaryRestrictions: plusOneDraft.dietary_restrictions,
              }
            : undefined,
      });

      if (!res.ok) {
        setError(getErrorMessage('errorCode' in res ? res.errorCode : 'save_failed'));
        return;
      }

      const relatedStatuses =
        profile.family_role === 'parent'
          ? profile.related.map((relative) =>
              relative.status === 'pending' ? 'tentative' : (relative.status as RsvpStatus)
            )
          : [];
      const plusOneStatuses =
        addPlusOne && profile.can_add_plus_one && res.plusOneCreated ? [plusOneDraft.status] : [];
      const allStatuses: RsvpStatus[] = [status, ...relatedStatuses, ...plusOneStatuses];
      const decisionCounts: Record<RsvpStatus, number> = {
        confirmed: allStatuses.filter((s) => s === 'confirmed').length,
        declined: allStatuses.filter((s) => s === 'declined').length,
        tentative: allStatuses.filter((s) => s === 'tentative').length,
      };

      setSuccess({
        guestName: res.guestName,
        status: res.status,
        confirmedAt: res.confirmedAt,
        invitedEvents: selectedGuest.invited_events,
        decisionCounts,
      });
    });
  };

  const loadGuestDetails = (guest: PublicGuest) => {
    setSelectedGuest(guest);
    setSuccess(null);
    setError(null);

    startProfileLoad(async () => {
      const details = await getPublicRsvpDetails(guest.invitation_guid);
      if (!details.ok) {
        setProfile(null);
        setError(
          getErrorMessage('errorCode' in details ? details.errorCode : 'invitation_not_found')
        );
        return;
      }

      setProfile(details.data);
      setAddPlusOne(false);
      setPlusOneDraft({
        first_name: '',
        last_name: '',
        status: 'tentative',
        email: '',
        phone: '',
        dietary_restrictions: '',
      });
      setStatus(details.data.guest.status === 'pending' ? 'confirmed' : details.data.guest.status);
    });
  };

  const decisionSummaryMessage = (counts: Record<RsvpStatus, number>) => {
    const messages: string[] = [];
    if (counts.confirmed > 0) {
      messages.push(t('rsvp.success.groupConfirmed', { count: counts.confirmed }));
    }
    if (counts.declined > 0) {
      messages.push(t('rsvp.success.groupDeclined', { count: counts.declined }));
    }
    if (counts.tentative > 0) {
      messages.push(t('rsvp.success.groupTentative', { count: counts.tentative }));
    }
    return messages.join(' ');
  };

  const updateGuestField = (field: 'email' | 'phone' | 'dietary_restrictions', value: string) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        guest: {
          ...prev.guest,
          [field]: value,
        },
      };
    });
  };

  const updateRelatedField = (
    relatedId: string,
    field: 'email' | 'phone' | 'dietary_restrictions',
    value: string
  ) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        related: prev.related.map((relative) =>
          relative.id === relatedId
            ? {
                ...relative,
                [field]: value,
              }
            : relative
        ),
      };
    });
  };

  const updateRelatedStatus = (relatedId: string, value: RsvpStatus) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        related: prev.related.map((relative) =>
          relative.id === relatedId
            ? {
                ...relative,
                status: value,
              }
            : relative
        ),
      };
    });
  };

  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'es' ? 'es-DO' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-3xl">{t('rsvp.title')}</CardTitle>
          <CardDescription>{t('rsvp.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-search">{t('rsvp.search.label')}</Label>
            <div className="flex gap-2">
              <Input
                id="guest-search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={t('rsvp.search.placeholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? t('rsvp.actions.searching') : t('rsvp.actions.search')}
              </Button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <Label>{t('rsvp.search.selectInvitation')}</Label>
              <div className="grid gap-2">
                {results.map((guest) => {
                  const isActive = selectedGuest?.invitation_guid === guest.invitation_guid;
                  return (
                    <button
                      key={guest.invitation_guid}
                      type="button"
                      className={`rounded-lg border p-3 text-left transition ${
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      }`}
                      onClick={() => loadGuestDetails(guest)}
                    >
                      <p className="font-medium">
                        {guest.first_name} {guest.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('rsvp.search.invitationFor', {
                          events: formatInvitedEvents(guest.invited_events),
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedGuest && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{t('rsvp.search.selectedInvitation')}</p>
              <p className="text-muted-foreground">
                {selectedGuest.first_name} {selectedGuest.last_name}
              </p>
              <p className="text-muted-foreground">
                {t('rsvp.search.eventsLabel', {
                  events: formatInvitedEvents(selectedGuest.invited_events),
                })}
              </p>
              {isLoadingProfile && (
                <p className="text-xs text-muted-foreground">{t('rsvp.search.loadingProfile')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>{t('rsvp.profile.title')}</CardTitle>
            <CardDescription>{t('rsvp.profile.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guest-email">{t('rsvp.profile.email')}</Label>
                <Input
                  id="guest-email"
                  value={profile.guest.email ?? ''}
                  onChange={(e) => updateGuestField('email', e.target.value)}
                  placeholder={t('rsvp.profile.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">{t('rsvp.profile.phone')}</Label>
                <Input
                  id="guest-phone"
                  value={profile.guest.phone ?? ''}
                  onChange={(e) => updateGuestField('phone', e.target.value)}
                  placeholder={t('rsvp.profile.phonePlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-diet">{t('rsvp.profile.dietaryRestrictions')}</Label>
              <Textarea
                id="guest-diet"
                value={profile.guest.dietary_restrictions ?? ''}
                onChange={(e) => updateGuestField('dietary_restrictions', e.target.value)}
                placeholder={t('rsvp.profile.dietaryPlaceholder')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {profile?.can_add_plus_one && (
        <Card>
          <CardHeader>
            <CardTitle>{t('rsvp.plusOne.title')}</CardTitle>
            <CardDescription>{t('rsvp.plusOne.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addPlusOne}
                onChange={(e) => setAddPlusOne(e.target.checked)}
              />
              {t('rsvp.plusOne.enable')}
            </label>

            <p className="rounded-md border border-amber-300/60 bg-amber-100/50 p-3 text-sm text-amber-900">
              {t('rsvp.plusOne.noticeNoDelete')}
            </p>

            {addPlusOne && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plus-one-first-name">{t('guests.firstName')}</Label>
                    <Input
                      id="plus-one-first-name"
                      value={plusOneDraft.first_name}
                      onChange={(e) =>
                        setPlusOneDraft((prev) => ({ ...prev, first_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plus-one-last-name">{t('guests.lastName')}</Label>
                    <Input
                      id="plus-one-last-name"
                      value={plusOneDraft.last_name}
                      onChange={(e) =>
                        setPlusOneDraft((prev) => ({ ...prev, last_name: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('rsvp.status.title')}</Label>
                  <RadioGroup
                    value={plusOneDraft.status}
                    onValueChange={(value) =>
                      setPlusOneDraft((prev) => ({ ...prev, status: value as RsvpStatus }))
                    }
                    className="grid gap-2 sm:grid-cols-3"
                  >
                    <div className="flex items-center space-x-2 rounded-lg border p-2">
                      <RadioGroupItem value="confirmed" id="plus-one-status-confirmed" />
                      <Label htmlFor="plus-one-status-confirmed">{t('rsvp.status.confirm')}</Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-lg border p-2">
                      <RadioGroupItem value="tentative" id="plus-one-status-tentative" />
                      <Label htmlFor="plus-one-status-tentative">{t('rsvp.status.tentative')}</Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-lg border p-2">
                      <RadioGroupItem value="declined" id="plus-one-status-declined" />
                      <Label htmlFor="plus-one-status-declined">{t('rsvp.status.decline')}</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plus-one-email">{t('rsvp.profile.email')}</Label>
                    <Input
                      id="plus-one-email"
                      value={plusOneDraft.email}
                      onChange={(e) =>
                        setPlusOneDraft((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder={t('rsvp.profile.emailPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plus-one-phone">{t('rsvp.profile.phone')}</Label>
                    <Input
                      id="plus-one-phone"
                      value={plusOneDraft.phone}
                      onChange={(e) =>
                        setPlusOneDraft((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder={t('rsvp.profile.phonePlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plus-one-diet">{t('rsvp.profile.dietaryRestrictions')}</Label>
                  <Textarea
                    id="plus-one-diet"
                    value={plusOneDraft.dietary_restrictions}
                    onChange={(e) =>
                      setPlusOneDraft((prev) => ({
                        ...prev,
                        dietary_restrictions: e.target.value,
                      }))
                    }
                    placeholder={t('rsvp.related.dietaryPlaceholder')}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('rsvp.status.title')}</CardTitle>
          <CardDescription>{t('rsvp.status.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={status}
            onValueChange={(value) => setStatus(value as RsvpStatus)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <RadioGroupItem value="confirmed" id="status-confirmed" />
              <Label htmlFor="status-confirmed">{t('rsvp.status.confirm')}</Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <RadioGroupItem value="tentative" id="status-tentative" />
              <Label htmlFor="status-tentative">{t('rsvp.status.tentative')}</Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <RadioGroupItem value="declined" id="status-declined" />
              <Label htmlFor="status-declined">{t('rsvp.status.decline')}</Label>
            </div>
          </RadioGroup>

          {profile && profile.family_role === 'parent' && profile.related.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('rsvp.related.title')}</CardTitle>
                <CardDescription>{t('rsvp.related.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.related.map((relative) => (
                  <div key={relative.id} className="space-y-3 rounded-lg border p-4">
                    <div>
                      <p className="font-medium">
                        {relative.first_name} {relative.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('rsvp.search.invitationFor', {
                          events: formatInvitedEvents(relative.invited_events),
                        })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('rsvp.status.title')}</Label>
                      <RadioGroup
                        value={relative.status === 'pending' ? 'tentative' : relative.status}
                        onValueChange={(value) =>
                          updateRelatedStatus(relative.id, value as RsvpStatus)
                        }
                        className="grid gap-2 sm:grid-cols-3"
                      >
                        <div className="flex items-center space-x-2 rounded-lg border p-2">
                          <RadioGroupItem
                            value="confirmed"
                            id={`related-${relative.id}-confirmed`}
                          />
                          <Label htmlFor={`related-${relative.id}-confirmed`}>
                            {t('rsvp.status.confirm')}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-lg border p-2">
                          <RadioGroupItem
                            value="tentative"
                            id={`related-${relative.id}-tentative`}
                          />
                          <Label htmlFor={`related-${relative.id}-tentative`}>
                            {t('rsvp.status.tentative')}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-lg border p-2">
                          <RadioGroupItem value="declined" id={`related-${relative.id}-declined`} />
                          <Label htmlFor={`related-${relative.id}-declined`}>
                            {t('rsvp.status.decline')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`related-${relative.id}-email`}>
                          {t('rsvp.profile.email')}
                        </Label>
                        <Input
                          id={`related-${relative.id}-email`}
                          value={relative.email ?? ''}
                          onChange={(e) => updateRelatedField(relative.id, 'email', e.target.value)}
                          placeholder={t('rsvp.profile.emailPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`related-${relative.id}-phone`}>
                          {t('rsvp.profile.phone')}
                        </Label>
                        <Input
                          id={`related-${relative.id}-phone`}
                          value={relative.phone ?? ''}
                          onChange={(e) => updateRelatedField(relative.id, 'phone', e.target.value)}
                          placeholder={t('rsvp.profile.phonePlaceholder')}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`related-${relative.id}-diet`}>
                        {t('rsvp.profile.dietaryRestrictions')}
                      </Label>
                      <Textarea
                        id={`related-${relative.id}-diet`}
                        value={relative.dietary_restrictions ?? ''}
                        onChange={(e) =>
                          updateRelatedField(relative.id, 'dietary_restrictions', e.target.value)
                        }
                        placeholder={t('rsvp.related.dietaryPlaceholder')}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedGuest || !profile}
            className="w-full"
          >
            {isSubmitting ? t('rsvp.actions.saving') : t('rsvp.actions.saveConfirmation')}
          </Button>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="space-y-3 rounded-lg border border-sage/30 bg-sage/10 p-4">
              <p className="font-medium">
                {t('rsvp.success.thanksSaved', { name: success.guestName })}
              </p>
              <p className="text-sm text-muted-foreground">{t('rsvp.success.thanksForYourTime')}</p>
              <div className="rounded-md border bg-background/60 p-3 text-sm text-muted-foreground">
                <p>
                  {t('rsvp.success.status')}:{' '}
                  <Badge variant="outline">{statusLabel(success.status)}</Badge>
                </p>
                <p className="mt-1">
                  {t('rsvp.success.invitationFor', {
                    events: formatInvitedEvents(success.invitedEvents),
                  })}
                </p>
                <p className="mt-1">
                  {t('rsvp.success.updatedAt', { date: formatDateTime(success.confirmedAt) })}
                </p>
              </div>
              <p className="rounded-md border bg-background/60 p-3 text-sm text-muted-foreground">
                {decisionSummaryMessage(success.decisionCounts)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('rsvp.success.changeResponseHint')}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSuccess(null)}>
                  {t('rsvp.actions.changeResponse')}
                </Button>
                <Button asChild>
                  <Link href="/">{t('rsvp.actions.goHome')}</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
