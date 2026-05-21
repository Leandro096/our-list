'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { assignSeat, removeSeatAssignment, createTable, deleteTable, updateTable } from '@/services'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Armchair, Users, X, Trash2, Search } from 'lucide-react'
import { useTranslation } from '@/locales/i18n-provider'

interface SeatingManagerProps {
  guests: SeatingGuest[]
  assignments: SeatingAssignmentWithGuest[]
  tables: Table[]
}

export function SeatingManager({ guests, assignments, tables: initialTables }: SeatingManagerProps) {
  const supabase = createClient()
  const router = useRouter()
  const { t } = useTranslation()
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

  // Edit dialog state
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editCapacity, setEditCapacity] = useState(10)
  const [editGuestSearch, setEditGuestSearch] = useState('')
  const [editSelectedGuests, setEditSelectedGuests] = useState<string[]>([])
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [isSubmittingEditAssign, setIsSubmittingEditAssign] = useState(false)

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
      toast({ title: t('seating.tableAdded'), description: t('seating.tableCreated', { name: created.name }) })
    } catch (error) {
      console.error('Error creating table:', error)
      toast({ title: t('common.error'), description: t('seating.tableCreationError'), variant: 'destructive' })
    } finally {
      setIsSubmittingTable(false)
    }
  }

  const handleDeleteTable = async (tableId: string) => {
    try {
      await deleteTable(supabase, tableId)
      setTables(tables.filter(t => t.id !== tableId))
      router.refresh()
      toast({ title: t('seating.tableDeleted') })
    } catch (error) {
      console.error('Error deleting table:', error)
      toast({ title: t('common.error'), description: t('seating.tableDeleteError'), variant: 'destructive' })
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
      toast({ title: t('seating.guestsAssigned'), description: t('seating.guestsAssignedDesc', { count: selectedGuests.length }) })
    } catch (error) {
      console.error('Error assigning guests:', error)
      toast({ title: t('common.error'), description: t('seating.guestAssignError'), variant: 'destructive' })
    } finally {
      setIsSubmittingAssign(false)
    }
  }

  const handleRemoveAssignment = async (guestId: string) => {
    try {
      await removeSeatAssignment(supabase, guestId)
      router.refresh()
      toast({ title: t('seating.guestUnassigned') })
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast({ title: t('common.error'), description: t('seating.guestUnassignError'), variant: 'destructive' })
    }
  }

  const openEditDialog = (table: Table) => {
    setEditingTable(table)
    setEditName(table.name)
    setEditNumber(table.number)
    setEditCategory(table.category ?? '')
    setEditNotes(table.notes ?? '')
    setEditCapacity(table.capacity)
    setEditGuestSearch('')
    setEditSelectedGuests([])
  }

  const handleUpdateTable = async () => {
    if (!editingTable || !editName || !editNumber) return
    setIsSubmittingEdit(true)
    try {
      const updated = await updateTable(supabase, editingTable.id, {
        name: editName,
        number: editNumber,
        category: editCategory || null,
        notes: editNotes || null,
        capacity: editCapacity,
      })
      setTables(tables.map(t => t.id === updated.id ? updated : t))
      toast({ title: t('seating.tableUpdated'), description: t('seating.tableUpdatedDesc', { name: updated.name }) })
      setEditingTable(null)
      router.refresh()
    } catch (error) {
      console.error('Error updating table:', error)
      toast({ title: t('common.error'), description: t('seating.tableUpdateError'), variant: 'destructive' })
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handleEditAssignGuests = async () => {
    if (!editingTable || !editSelectedGuests.length) return
    setIsSubmittingEditAssign(true)
    try {
      await Promise.all(
        editSelectedGuests.map(guestId =>
          assignSeat(supabase, { guest_id: guestId, table_id: editingTable.id })
        )
      )
      router.refresh()
      setEditSelectedGuests([])
      setEditGuestSearch('')
      toast({ title: t('seating.guestsAssigned'), description: t('seating.guestsAssignedDesc', { count: editSelectedGuests.length }) })
    } catch (error) {
      console.error('Error assigning guests from edit dialog:', error)
      toast({ title: t('common.error'), description: t('seating.guestAssignError'), variant: 'destructive' })
    } finally {
      setIsSubmittingEditAssign(false)
    }
  }

  const toggleEditGuestSelection = (guestId: string) => {
    setEditSelectedGuests(prev =>
      prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]
    )
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
              <p className="text-sm text-muted-foreground">{t('seating.tables')}</p>
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
              <p className="text-sm text-muted-foreground">{t('seating.assigned')}</p>
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
              <p className="text-sm text-muted-foreground">{t('seating.unassigned')}</p>
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
              {t('seating.addTable')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('seating.addNewTable')}</DialogTitle>
              <DialogDescription className="sr-only">{t('seating.addTableDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tableNumber">{t('seating.tableNumberId')}</Label>
                  <Input
                    id="tableNumber"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder={t('seating.tableNumberPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tableCapacity">{t('seating.capacity')}</Label>
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
                <Label htmlFor="tableName">{t('seating.tableName')}</Label>
                <Input
                  id="tableName"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder={t('seating.tableNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableCategory">{t('seating.tableCategory')}</Label>
                <Input
                  id="tableCategory"
                  value={newTableCategory}
                  onChange={(e) => setNewTableCategory(e.target.value)}
                  placeholder={t('seating.tableCategoryPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableNotes">{t('seating.notes')}</Label>
                <Textarea
                  id="tableNotes"
                  value={newTableNotes}
                  onChange={(e) => setNewTableNotes(e.target.value)}
                  placeholder={t('seating.notesPlaceholder')}
                  rows={2}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddTable}
                className="w-full"
                disabled={!newTableName || !newTableNumber || isSubmittingTable}
              >
                {isSubmittingTable ? t('seating.adding') : t('seating.addTable')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAssigning} onOpenChange={setIsAssigning}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Users className="mr-2 h-4 w-4" />
              {t('seating.assignGuest')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('seating.assignGuestsToTable')}</DialogTitle>
              <DialogDescription className="sr-only">{t('seating.assignGuestDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Table selector */}
              <div className="space-y-2">
                <Label>{t('seating.table')}</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('seating.selectTable')} />
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
                          {occupied >= table.capacity ? ` (${t('seating.full')})` : ` (${occupied}/${table.capacity})`}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Guest list with search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('seating.guestsSelected', { count: selectedGuests.length })}</Label>
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
                      {selectedGuests.length === unassignedGuests.length ? t('seating.deselectAll') : t('seating.selectAll')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('seating.searchGuests')}
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {unassignedGuests.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t('seating.allGuestsAssigned')}</p>
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
                  ? t('seating.assigning')
                  : selectedGuests.length > 0
                    ? t('seating.assignCount', { count: selectedGuests.length })
                    : t('seating.assignGuest')}
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
            <p className="mt-4 text-muted-foreground">{t('seating.noTables')}</p>
            <p className="text-sm text-muted-foreground">
              {t('seating.noTablesDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const tableGuests = getTableGuests(table.id)
            const isFull = tableGuests.length >= table.capacity
            return (
              <Card
                key={table.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openEditDialog(table)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-muted-foreground">#{table.number}</span>
                        <span className="font-serif">{table.name}</span>
                      </div>
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
                        onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id) }}
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
                    <p className="text-sm text-muted-foreground">{t('seating.noGuestsAssigned')}</p>
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
                            onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(assignment.guests?.id) }}
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
            <CardTitle className="font-serif">{t('seating.unassignedGuests', { count: unassignedGuests.length })}</CardTitle>
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

      {/* Edit Table Dialog */}
      {editingTable && (
        <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('seating.editTableTitle')} — <span className="font-mono text-muted-foreground">#{editingTable.number}</span></DialogTitle>
              <DialogDescription className="sr-only">{t('seating.editTableDesc')}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">{t('seating.tableDetails')}</TabsTrigger>
                <TabsTrigger value="guests" className="flex-1">{t('seating.manageGuests')}</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editNumber">{t('seating.tableNumberId')}</Label>
                    <Input
                      id="editNumber"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      placeholder={t('seating.tableNumberPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editCapacity">{t('seating.capacity')}</Label>
                    <Input
                      id="editCapacity"
                      type="number"
                      min={1}
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editName">{t('seating.tableName')}</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t('seating.tableNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">{t('seating.tableCategory')}</Label>
                  <Input
                    id="editCategory"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder={t('seating.tableCategoryPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">{t('seating.notes')}</Label>
                  <Textarea
                    id="editNotes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t('seating.notesPlaceholder')}
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleUpdateTable}
                  className="w-full"
                  disabled={!editName || !editNumber || isSubmittingEdit}
                >
                  {isSubmittingEdit ? t('common.saving') : t('common.save')}
                </Button>
              </TabsContent>

              {/* Guests Tab */}
              <TabsContent value="guests" className="space-y-4 pt-2">
                {/* Currently assigned */}
                <div className="space-y-2">
                  <Label>{t('seating.assignedGuests')}</Label>
                  {getTableGuests(editingTable.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('seating.noGuestsAssigned')}</p>
                  ) : (
                    <div className="space-y-1">
                      {getTableGuests(editingTable.id).map((assignment) => (
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
                </div>

                {/* Add more guests */}
                {unassignedGuests.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('seating.addMoreGuests')} ({editSelectedGuests.length} {t('seating.guestsSelected', { count: editSelectedGuests.length }).split('(')[0].trim().toLowerCase()})</Label>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('seating.searchGuests')}
                        value={editGuestSearch}
                        onChange={(e) => setEditGuestSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-40 rounded-md border">
                      <div className="p-2 space-y-1">
                        {unassignedGuests
                          .filter(g =>
                            `${g.first_name} ${g.last_name}`
                              .toLowerCase()
                              .includes(editGuestSearch.toLowerCase())
                          )
                          .map((guest) => (
                            <label
                              key={guest.id}
                              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                            >
                              <Checkbox
                                checked={editSelectedGuests.includes(guest.id)}
                                onCheckedChange={() => toggleEditGuestSelection(guest.id)}
                              />
                              <span className="text-sm">
                                {guest.first_name} {guest.last_name}
                              </span>
                            </label>
                          ))}
                      </div>
                    </ScrollArea>
                    <Button
                      type="button"
                      onClick={handleEditAssignGuests}
                      className="w-full"
                      disabled={!editSelectedGuests.length || isSubmittingEditAssign}
                    >
                      {isSubmittingEditAssign
                        ? t('seating.assigning')
                        : t('seating.assignCount', { count: editSelectedGuests.length })}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
