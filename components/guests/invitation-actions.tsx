'use client';

import { ShareMenu, type ShareGuest } from '@/components/invitations/share-menu';

/** Send the save-the-date link from a single guest's page. */
export function InvitationActions({ guest }: { guest: ShareGuest }) {
  return <ShareMenu guest={guest} variant="split" />;
}
