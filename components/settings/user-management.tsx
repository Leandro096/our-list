'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { assignRole, removeRole } from '@/services'
import type { UserWithRoleAssignments } from '@/services'
import type { Role } from '@/lib/types'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Shield, User, Crown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface UserManagementProps {
  users: UserWithRoleAssignments[]
  roles: Role[]
}

export function UserManagement({ users, roles }: UserManagementProps) {
  const supabase = createClient()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRoleAssignments | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return

    try {
      const existingRole = selectedUser.user_roles.find((ur) => ur.role_id === selectedRole)
      if (existingRole) {
        alert('This role is already assigned to the user')
        return
      }

      await assignRole(supabase, selectedUser.id, selectedRole)

      router.refresh()
      setIsDialogOpen(false)
      setSelectedUser(null)
      setSelectedRole('')
    } catch (error) {
      console.error('Error assigning role:', error)
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      await removeRole(supabase, userId, roleId)
      router.refresh()
    } catch (error) {
      console.error('Error removing role:', error)
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="h-3 w-3" />
      case 'coordinator':
        return <User className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            user.is_super_admin ? 'bg-primary/10' : 'bg-muted'
                          }`}>
                            {user.is_super_admin ? (
                              <Crown className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.display_name || 'Unnamed User'}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.is_super_admin && (
                            <Badge className="bg-primary text-primary-foreground">
                              <Crown className="mr-1 h-3 w-3" />
                              Super Admin
                            </Badge>
                          )}
                          {user.user_roles.map((ur) => (
                            <Badge
                              key={ur.role_id}
                              variant="outline"
                              className="cursor-pointer hover:bg-destructive/10"
                              onClick={() => handleRemoveRole(user.id, ur.role_id)}
                              title="Click to remove"
                            >
                              {getRoleIcon(ur.roles.name)}
                              <span className="ml-1">{ur.roles.name}</span>
                            </Badge>
                          ))}
                          {user.user_roles.length === 0 && !user.is_super_admin && (
                            <span className="text-sm text-muted-foreground">No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                          setIsDialogOpen(open)
                          if (!open) {
                            setSelectedUser(null)
                            setSelectedRole('')
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Role</DialogTitle>
                              <DialogDescription className="sr-only">Select a role to assign to this user.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">
                                Assign a role to {user.display_name || user.email}
                              </p>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((role) => (
                                      <SelectItem key={role.id} value={role.id}>
                                        <div>
                                          <p className="font-medium">{role.name}</p>
                                          {role.description && (
                                            <p className="text-xs text-muted-foreground">
                                              {role.description}
                                            </p>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={handleAssignRole}
                                className="w-full"
                                disabled={!selectedRole}
                              >
                                Assign Role
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Roles Info */}
      <Card>
        <CardHeader>
          <CardTitle>Available Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-2">
                  {getRoleIcon(role.name)}
                  <h4 className="font-medium">{role.name}</h4>
                </div>
                {role.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {role.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
