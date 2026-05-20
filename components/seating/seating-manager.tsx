'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { assignSeat, removeSeatAssignment } from '@/services'
import type { SeatingGuest, SeatingAssignmentWithGuest } from '@/services'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Armchair, Users, X } from 'lucide-react'

interface SeatingManagerProps {
  guests: SeatingGuest[]
  assignments: SeatingAssignmentWithGuest[]
  tables: string[]
}

export function SeatingManager({ guests, assignments, tables: initialTables }: SeatingManagerProps) {
  const supabase = createClient()
  const router = useRouter()
  const [tables, setTables] = useState(initialTables)
  const [newTableName, setNewTableName] = useState('')
  const [selectedGuest, setSelectedGuest] = useState<string>('')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [isAddingTable, setIsAddingTable] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  const unassignedGuests = guests.filter(g => !g.seating_assignments?.length)
  const assignedGuestsCount = guests.length - unassignedGuests.length

  const getTableGuests = (tableNumber: string) => {
    return assignments.filter(a => a.table_number === tableNumber)
  }

  const handleAddTable = () => {
    if (newTableName && !tables.includes(newTableName)) {
      setTables([...tables, newTableName])
      setNewTableName('')
      setIsAddingTable(false)
    }
  }

  const handleAssignGuest = async () => {
    if (!selectedGuest || !selectedTable) return

    try {
      await assignSeat(supabase, { guest_id: selectedGuest, table_number: selectedTable })

      router.refresh()
      setSelectedGuest('')
      setSelectedTable('')
      setIsAssigning(false)
    } catch (error) {
      console.error('Error assigning guest:', error)
    }
  }

  const handleRemoveAssignment = async (guestId: string) => {
    try {
      await removeSeatAssignment(supabase, guestId)
      router.refresh()
    } catch (error) {
      console.error('Error removing assignment:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Armchair className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tables.length}</p>
              <p className="text-sm text-muted-foreground">Tables</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10">
              <Users className="h-5 w-5 text-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assignedGuestsCount}</p>
              <p className="text-sm text-muted-foreground">Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unassignedGuests.length}</p>
              <p className="text-sm text-muted-foreground">Unassigned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={isAddingTable} onOpenChange={setIsAddingTable}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Table</DialogTitle>
              <DialogDescription className="sr-only">Fill in the details to add a new table.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tableName">Table Name/Number</Label>
                <Input
                  id="tableName"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g., Table 1, Head Table, VIP"
                />
              </div>
              <Button onClick={handleAddTable} className="w-full">
                Add Table
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAssigning} onOpenChange={setIsAssigning}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Users className="mr-2 h-4 w-4" />
              Assign Guest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Guest to Table</DialogTitle>
              <DialogDescription className="sr-only">Select a guest and a table to assign them.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Guest</Label>
                <Select value={selectedGuest} onValueChange={setSelectedGuest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedGuests.map((guest) => (
                      <SelectItem key={guest.id} value={guest.id}>
                        {guest.first_name} {guest.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAssignGuest} 
                className="w-full"
                disabled={!selectedGuest || !selectedTable}
              >
                Assign Guest
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Armchair className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No tables created yet</p>
            <p className="text-sm text-muted-foreground">
              Add tables to start assigning guests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const tableGuests = getTableGuests(table)
            return (
              <Card key={table}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="font-serif">{table}</span>
                    <Badge variant="outline">{tableGuests.length} guests</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tableGuests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No guests assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {tableGuests.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                        >
                          <span className="text-sm">
                            {assignment.guests?.first_name} {assignment.guests?.last_name}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveAssignment(assignment.guests?.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Unassigned Guests */}
      {unassignedGuests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Unassigned Guests ({unassignedGuests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassignedGuests.map((guest) => (
                <Badge key={guest.id} variant="outline">
                  {guest.first_name} {guest.last_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
