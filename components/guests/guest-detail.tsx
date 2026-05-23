'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil, QrCode, Mail, Phone, UtensilsCrossed, StickyNote, Armchair, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import type { Category } from '@/lib/types'

interface GuestDetailProps {
  guest: {
    id: string
    invitation_guid: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    status: 'pending' | 'confirmed' | 'declined' | 'tentative'
    dietary_restrictions: string | null
    notes: string | null
    is_plus_one: boolean
    created_at: string
    updated_at: string
    guest_categories: Array<{
      category_id: string
      categories: Pick<Category, 'id' | 'name' | 'color'>
    }>
    event_attendance: Array<{
      event_type: string
      attending: boolean | null
    }>
    seating_assignments: Array<{
      tables: { number: string } | null
    }>
    scan_logs: Array<{
      id: string
      scanned_at: string
      event_type: string
      is_duplicate: boolean
      users: { display_name: string }
    }>
  }
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'outline' as const, color: 'text-primary' },
  confirmed: { label: 'Confirmed', variant: 'default' as const, color: 'text-sage' },
  declined: { label: 'Declined', variant: 'secondary' as const, color: 'text-muted-foreground' },
  tentative: { label: 'Tentative', variant: 'outline' as const, color: 'text-accent' },
}

export function GuestDetail({ guest }: GuestDetailProps) {
  const seating = guest.seating_assignments?.[0]
  const ceremonyAttendance = guest.event_attendance?.find(ea => ea.event_type === 'ceremony')
  const receptionAttendance = guest.event_attendance?.find(ea => ea.event_type === 'reception')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/guests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Guests
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/guests/${guest.id}/qr`}>
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </Link>
          </Button>
          <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href={`/dashboard/guests/${guest.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
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
                    <span className="text-sm text-muted-foreground">Plus One</span>
                  )}
                </div>
                <Badge variant={statusConfig[guest.status].variant}>
                  {statusConfig[guest.status].label}
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
                  <span>
                    Table {seating.tables?.number}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Event Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium">Ceremony</h4>
                  <p className="text-sm text-muted-foreground">
                    {ceremonyAttendance?.attending === true
                      ? 'Attending'
                      : ceremonyAttendance?.attending === false
                      ? 'Not Attending'
                      : 'Awaiting Response'}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium">Reception</h4>
                  <p className="text-sm text-muted-foreground">
                    {receptionAttendance?.attending === true
                      ? 'Attending'
                      : receptionAttendance?.attending === false
                      ? 'Not Attending'
                      : 'Awaiting Response'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan History */}
          <Card>
            <CardHeader>
              <CardTitle>Check-in History</CardTitle>
            </CardHeader>
            <CardContent>
              {guest.scan_logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No check-ins yet</p>
              ) : (
                <div className="space-y-3">
                  {guest.scan_logs.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          scan.is_duplicate ? 'bg-destructive/10' : 'bg-sage/20'
                        }`}>
                          <ScanLine className={`h-4 w-4 ${
                            scan.is_duplicate ? 'text-destructive' : 'text-sage'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {scan.event_type === 'ceremony' ? 'Ceremony' : 'Reception'}
                            {scan.is_duplicate && ' (Duplicate)'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {scan.users?.display_name || 'Unknown'}
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
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {guest.guest_categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories assigned</p>
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
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Invitation ID</p>
                <p className="font-mono text-xs">{guest.invitation_guid}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Added</p>
                <p>{formatDistanceToNow(new Date(guest.created_at), { addSuffix: true })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p>{formatDistanceToNow(new Date(guest.updated_at), { addSuffix: true })}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
