'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { assignSeat, removeSeatAssignment, createTable, deleteTable } from '@/services'
import { toast } from '@/hooks/use-toast'
import type { SeatingGuest, SeatingAssignmentWithGuest } from '@/services'
import type { Table } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Armchair, Users, X, Trash2, Search } from 'lucide-react'

interface SeatingManagerProps {
  guests: SeatingGuest[]
  assignments: SeatingAssignmentWithGuest[]
  tables: Table[]
}

export function SeatingManager({ guests, assignments, tables: initialTables }: SeatingManagerProps) {
  const supabase = createClient()
  const router = useRouter()
  const [tables, setTables] = useState(initialTables)
  const [newTableName, setNewTableName] = useState('')
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCategory, setNewTableCategory] = useState('')
  const [newTableNotes, setNewTableNotes] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState(10)
  const [selectedGuests, setSelectedGuests] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [guestSearch, setGuestSearch] = useState('')
  const [isAddingTable, setIsAddingTable] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false)
  const [isSubmittingTable, setIsSubmittingTable] = useState(false)

  const assignedGuestIds = new Set(assignments.map(a => a.guest_id))
  const unassignedGuests = guests.filter(g => !assignedGuestIds.has(g.id))
  const assignedGuestsCount = guests.length - unassignedGuests.length

  const getTableGuests = (tableId: string) => {
    return assignments.filter(a => a.table_id === tableId)
  }

  const handleAddTable = async () => {
    if (!newTableName || !newTableNumber) return

    setIsSubmittingTable(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const created = await createTable(supabase, {
        name: newTableName,
        number: newTableNumber,
        category: newTableCategory || null,
        notes: newTableNotes || null,
        capacity: newTableCapacity,
        created_by: user?.id ?? null,
      })
      setTables([...tables, created])
      setNewTableName('')
      setNewTableNumber('')
      setNewTableCategory('')
      setNewTableNotes('')
      setNewTableCapacity(10)
      setIsAddingTable(false)
      toast({ title: 'Table added', description: `${created.name} has been created.` })
    } catch (error) {
      console.error('Error creating table:', error)
      toast({ title: 'Error', description: 'Could not create table. Try again.', variant: 'destructive' })
    } finally {
      setIsSubmittingTable(false)
    }
  }

  const handleDeleteTable = async (tableId: string) => {
    try {
      await deleteTable(supabase, tableId)
      setTables(tables.filter(t => t.id !== tableId))
      router.refresh()
    } catch (error) {
      console.error('Error deleting table:', error)
    }
  }

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests(prev =>
      prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]
    )
  }

  const handleAssignGuest = async () => {
    if (!selectedGuests.length || !selectedTable) return

    setIsSubmittingAssign(true)
    try {
      await Promise.all(
        selectedGuests.map(guestId =>
          assignSeat(supabase, { guest_id: guestId, table_id: selectedTable })
        )
      )
      router.refresh()
      setSelectedGuests([])
      setSelectedTable('')
      setGuestSearch('')
      setIsAssigning(false)
      toast({ title: 'Guests assigned', description: `${selectedGuests.length} guest(s) assigned to table.` })
    } catch (error) {
      console.error('Error assigning guests:', error)
      toast({ title: 'Error', description: 'Could not assign guests. Try again.', variant: 'destructive' })
    } finally {
      setIsSubmittingAssign(false)
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tableNumber">Number / ID</Label>
                  <Input
                    id="tableNumber"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="e.g., 1, VIP, A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tableCapacity">Capacity</Label>
                  <Input
                    id="tableCapacity"
                    type="number"
                    min={1}
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableName">Name</Label>
                <Input
                  id="tableName"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g., Head Table, Mesa de Honor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableCategory">Category</Label>
                <Input
                  id="tableCategory"
                  value={newTableCategory}
                  onChange={(e) => setNewTableCategory(e.target.value)}
                  placeholder="e.g., Familia, Amigos, VIP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableNotes">Notes</Label>
                <Textarea
                  id="tableNotes"
                  value={newTableNotes}
                  onChange={(e) => setNewTableNotes(e.target.value)}
                  placeholder="Optional notes about this table"
                  rows={2}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddTable}
                className="w-full"
                disabled={!newTableName || !newTableNumber || isSubmittingTable}
              >
                {isSubmittingTable ? 'Adding...' : 'Add Table'}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Guests to Table</DialogTitle>
              <DialogDescription className="sr-only">Select guests and a table to assign them.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Table selector */}
              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => {
                      const occupied = getTableGuests(table.id).length
                      return (
                        <SelectItem
                          key={table.id}
                          value={table.id}
                          disabled={occupied >= table.capacity}
                        >
                          {table.number} — {table.name}
                          {occupied >= table.capacity ? ' (full)' : ` (${occupied}/${table.capacity})`}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Guest list with search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Guests ({selectedGuests.length} selected)</Label>
                  {unassignedGuests.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        selectedGuests.length === unassignedGuests.length
                          ? setSelectedGuests([])
                          : setSelectedGuests(unassignedGuests.map(g => g.id))
                      }
                    >
                      {selectedGuests.length === unassignedGuests.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {unassignedGuests.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">All guests are already assigned</p>
                ) : (
                  <ScrollArea className="h-48 rounded-md border">
                    <div className="p-2 space-y-1">
                      {unassignedGuests
                        .filter(g =>
                          `${g.first_name} ${g.last_name}`
                            .toLowerCase()
                            .includes(guestSearch.toLowerCase())
                        )
                        .map((guest) => (
                          <label
                            key={guest.id}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                          >
                            <Checkbox
                              checked={selectedGuests.includes(guest.id)}
                              onCheckedChange={() => toggleGuestSelection(guest.id)}
                            />
                            <span className="text-sm">
                              {guest.first_name} {guest.last_name}
                            </span>
                          </label>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <Button
                type="button"
                onClick={handleAssignGuest}
                className="w-full"
                disabled={!selectedGuests.length || !selectedTable || isSubmittingAssign}
              >
                {isSubmittingAssign
                  ? 'Assigning...'
                  : selectedGuests.length > 0
                    ? `Assign ${selectedGuests.length} guest(s)`
                    : 'Assign Guests'}
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
            const tableGuests = getTableGuests(table.id)
            const isFull = tableGuests.length >= table.capacity
            return (
              <Card key={table.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-serif">{table.name}</span>
                      {table.category && (
                        <span className="text-xs font-normal text-muted-foreground">{table.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isFull ? 'destructive' : 'outline'}>
                        {tableGuests.length}/{table.capacity}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteTable(table.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {table.notes && (
                    <p className="mb-2 text-xs text-muted-foreground">{table.notes}</p>
                  )}
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
