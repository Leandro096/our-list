'use server'

import { createClient } from '@/lib/supabase/server'
import { readLimiter } from '@/lib/rate-limit'

type PublicGuestResult = {
  invitation_guid: string
  first_name: string
  last_name: string
  invited_events: Array<'ceremony' | 'reception' | 'both'>
}

type PublicRsvpMember = {
  id: string
  first_name: string
  last_name: string
  status: 'pending' | 'confirmed' | 'tentative' | 'declined'
  email: string | null
  phone: string | null
  dietary_restrictions: string | null
  invited_events: Array<'ceremony' | 'reception' | 'both'>
}

type PublicRsvpDetails = {
  guest: PublicRsvpMember
  family_role: 'parent' | 'child'
  related: PublicRsvpMember[]
  can_add_plus_one: boolean
}

export type PublicRsvpErrorCode = 'invalid_invitation' | 'invitation_not_found' | 'save_failed'

const MIN_SEARCH_CHARS = 3
const MAX_RESULTS = 5

function sanitizeTerm(term: string): string {
  return term.trim().replace(/[%_,]/g, '')
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function toNullable(value?: string): string | null {
  if (value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeStatus(value: string): 'pending' | 'confirmed' | 'tentative' | 'declined' {
  if (value === 'confirmed' || value === 'tentative' || value === 'declined') return value
  return 'pending'
}

function extractInvitedEvents(
  rows: Array<{ event_type: 'ceremony' | 'reception' | 'both' }> | null | undefined,
): Array<'ceremony' | 'reception' | 'both'> {
  return Array.from(new Set((rows ?? []).map((event) => event.event_type)))
}

export async function searchGuestsForPublicRsvp(term: string): Promise<PublicGuestResult[]> {
  const cleaned = sanitizeTerm(term)
  if (cleaned.length < MIN_SEARCH_CHARS) return []

  // Rate limit by a stable per-IP key (anonymous public route).
  // We use the term as a rough per-session key; upgrade to header-based IP
  // if more precision is needed.
  const rateCheck = readLimiter.check('public_rsvp_search')
  if (!rateCheck.allowed) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('guests')
    .select('invitation_guid, first_name, last_name, event_attendance(event_type)')
    .or(`first_name.ilike.%${cleaned}%,last_name.ilike.%${cleaned}%`)
    .limit(MAX_RESULTS)

  return (data ?? []).map((row) => {
    const events = extractInvitedEvents(
      (row.event_attendance ?? []) as Array<{ event_type: 'ceremony' | 'reception' | 'both' }>,
    )

    return {
      invitation_guid: row.invitation_guid,
      first_name: row.first_name,
      last_name: row.last_name,
      invited_events: events,
    }
  })
}

export async function getPublicRsvpDetails(
  invitationGuid: string,
): Promise<{ ok: true; data: PublicRsvpDetails } | { ok: false; errorCode: PublicRsvpErrorCode }> {
  if (!isUuid(invitationGuid)) {
    return { ok: false, errorCode: 'invalid_invitation' }
  }

  const supabase = await createClient()
  const { data: base, error: baseError } = await supabase
    .from('guests')
    .select(
      'id, first_name, last_name, status, email, phone, dietary_restrictions, parent_guest_id, is_plus_one, event_attendance(event_type)',
    )
    .eq('invitation_guid', invitationGuid)
    .single()

  if (baseError || !base) {
    return { ok: false, errorCode: 'invitation_not_found' }
  }

  const familyRole: 'parent' | 'child' = base.parent_guest_id ? 'child' : 'parent'

  const guest: PublicRsvpMember = {
    id: base.id,
    first_name: base.first_name,
    last_name: base.last_name,
    status: normalizeStatus(base.status),
    email: base.email,
    phone: base.phone,
    dietary_restrictions: base.dietary_restrictions,
    invited_events: extractInvitedEvents(
      (base.event_attendance ?? []) as Array<{ event_type: 'ceremony' | 'reception' | 'both' }>,
    ),
  }

  let related: PublicRsvpMember[] = []
  if (familyRole === 'parent') {
    const { data: children } = await supabase
      .from('guests')
      .select(
        'id, first_name, last_name, status, email, phone, dietary_restrictions, event_attendance(event_type)',
      )
      .eq('parent_guest_id', base.id)
      .order('first_name')

    related = (children ?? []).map((child) => ({
      id: child.id,
      first_name: child.first_name,
      last_name: child.last_name,
      status: normalizeStatus(child.status),
      email: child.email,
      phone: child.phone,
      dietary_restrictions: child.dietary_restrictions,
      invited_events: extractInvitedEvents(
        (child.event_attendance ?? []) as Array<{ event_type: 'ceremony' | 'reception' | 'both' }>,
      ),
    }))
  }

  const canAddPlusOne = familyRole === 'parent' && Boolean(base.is_plus_one) && related.length === 0

  return {
    ok: true,
    data: {
      guest,
      family_role: familyRole,
      related,
      can_add_plus_one: canAddPlusOne,
    },
  }
}

export async function submitPublicRsvp(input: {
  invitationGuid: string
  status: 'confirmed' | 'tentative' | 'declined'
  email?: string
  phone?: string
  dietaryRestrictions?: string
  related?: Array<{
    id: string
    status: 'confirmed' | 'tentative' | 'declined'
    email?: string
    phone?: string
    dietaryRestrictions?: string
  }>
  plusOne?: {
    firstName: string
    lastName: string
    status: 'confirmed' | 'tentative' | 'declined'
    email?: string
    phone?: string
    dietaryRestrictions?: string
  }
}): Promise<
  | {
      ok: true
      guestName: string
      status: 'confirmed' | 'tentative' | 'declined'
      confirmedAt: string
      plusOneCreated: boolean
    }
  | { ok: false; errorCode: PublicRsvpErrorCode }
> {
  if (!isUuid(input.invitationGuid)) {
    return { ok: false, errorCode: 'invalid_invitation' }
  }

  const supabase = await createClient()

  const { data: baseGuest } = await supabase
    .from('guests')
    .select('id, first_name, last_name, parent_guest_id, is_plus_one')
    .eq('invitation_guid', input.invitationGuid)
    .single()

  if (!baseGuest) {
    return { ok: false, errorCode: 'invitation_not_found' }
  }

  const { data, error } = await supabase
    .from('guests')
    .update({
      status: input.status,
      email: toNullable(input.email),
      phone: toNullable(input.phone),
      dietary_restrictions: toNullable(input.dietaryRestrictions),
      updated_at: new Date().toISOString(),
    })
    .eq('id', baseGuest.id)
    .select('first_name, last_name, status, updated_at')
    .single()

  if (error || !data) {
    return { ok: false, errorCode: 'save_failed' }
  }

  let plusOneCreated = false

  if (!baseGuest.parent_guest_id && input.related && input.related.length > 0) {
    for (const relative of input.related) {
      if (!isUuid(relative.id)) continue

      await supabase
        .from('guests')
        .update({
          status: relative.status,
          email: toNullable(relative.email),
          phone: toNullable(relative.phone),
          dietary_restrictions: toNullable(relative.dietaryRestrictions),
          updated_at: new Date().toISOString(),
        })
        .eq('id', relative.id)
        .eq('parent_guest_id', baseGuest.id)
    }
  }

  if (!baseGuest.parent_guest_id && baseGuest.is_plus_one && input.plusOne) {
    const firstName = input.plusOne.firstName.trim()
    const lastName = input.plusOne.lastName.trim()

    if (firstName && lastName) {
      const { data: existingChildren } = await supabase
        .from('guests')
        .select('id')
        .eq('parent_guest_id', baseGuest.id)
        .limit(1)

      if (!existingChildren || existingChildren.length === 0) {
        const { data: createdPlusOne, error: plusOneError } = await supabase
          .from('guests')
          .insert({
            first_name: firstName,
            last_name: lastName,
            status: input.plusOne.status,
            email: toNullable(input.plusOne.email),
            phone: toNullable(input.plusOne.phone),
            dietary_restrictions: toNullable(input.plusOne.dietaryRestrictions),
            parent_guest_id: baseGuest.id,
            is_plus_one: true,
          })
          .select('id')
          .single()

        if (plusOneError || !createdPlusOne) {
          return { ok: false, errorCode: 'save_failed' }
        }

        const { data: parentAttendance } = await supabase
          .from('event_attendance')
          .select('event_type, attending')
          .eq('guest_id', baseGuest.id)

        if (parentAttendance && parentAttendance.length > 0) {
          const { error: attendanceError } = await supabase.from('event_attendance').insert(
            parentAttendance.map((row) => ({
              guest_id: createdPlusOne.id,
              event_type: row.event_type,
              attending: row.attending,
            })),
          )

          if (attendanceError) {
            return { ok: false, errorCode: 'save_failed' }
          }
        }

        plusOneCreated = true
      }
    }
  }

  return {
    ok: true,
    guestName: `${data.first_name} ${data.last_name}`,
    status: data.status as 'confirmed' | 'tentative' | 'declined',
    confirmedAt: data.updated_at,
    plusOneCreated,
  }
}
