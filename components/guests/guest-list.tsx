'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, MoreHorizontal, Eye, Pencil, Trash2, QrCode } from 'lucide-react'
import Link from 'next/link'
import type { Category } from '@/lib/types'

interface GuestWithRelations {
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
  guest_categories: Array<{
    category_id: string
    categories: Pick<Category, 'id' | 'name' | 'color'>
  }>
  event_attendance: Array<{
    event_type: string
    attending: boolean | null
  }>
  seating_assignments: Array<{
    table_number: string
    seat_number: number | null
  }>
}

interface GuestListProps {
  guests: GuestWithRelations[]
  categories: Category[]
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'outline' as const },
  confirmed: { label: 'Confirmed', variant: 'default' as const },
  declined: { label: 'Declined', variant: 'secondary' as const },
  tentative: { label: 'Tentative', variant: 'outline' as const },
}

export function GuestList({ guests, categories }: GuestListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredGuests = useMemo(() => {
    return guests.filter(guest => {
      // Search filter
      const searchLower = search.toLowerCase()
      const matchesSearch = search === '' || 
        guest.first_name.toLowerCase().includes(searchLower) ||
        guest.last_name.toLowerCase().includes(searchLower) ||
        guest.email?.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus = statusFilter === 'all' || guest.status === statusFilter

      // Category filter
      const matchesCategory = categoryFilter === 'all' || 
        guest.guest_categories.some(gc => gc.category_id === categoryFilter)

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [guests, search, statusFilter, categoryFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="tentative">Tentative</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: cat.color }} 
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredGuests.length} of {guests.length} guests
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Categories</TableHead>
              <TableHead className="hidden lg:table-cell">Table</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No guests found
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {guest.first_name} {guest.last_name}
                      </p>
                      {guest.is_plus_one && (
                        <span className="text-xs text-muted-foreground">Plus One</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {guest.email || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[guest.status].variant}>
                      {statusConfig[guest.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {guest.guest_categories.slice(0, 2).map((gc) => (
                        <Badge
                          key={gc.category_id}
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            borderColor: gc.categories.color,
                            color: gc.categories.color,
                          }}
                        >
                          {gc.categories.name}
                        </Badge>
                      ))}
                      {guest.guest_categories.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{guest.guest_categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {guest.seating_assignments?.[0]?.table_number || '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/qr`}>
                            <QrCode className="mr-2 h-4 w-4" />
                            QR Code
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
