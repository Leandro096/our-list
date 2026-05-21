'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  createRole,
  updateRole,
  deleteRole,
  updateRolePermissions,
} from '@/services'
import type { RoleWithPermissions } from '@/services'
import type { Permission } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'
import { useTranslation } from '@/locales/i18n-provider'
import { toast } from '@/hooks/use-toast'

interface RolesManagerProps {
  roles: RoleWithPermissions[]
  permissions: Permission[]
}

type EditState = {
  roleId: string | null  // null = creating new
  name: string
  description: string
  permissionIds: string[]
}

const EMPTY_EDIT: EditState = { roleId: null, name: '', description: '', permissionIds: [] }

export function RolesManager({ roles, permissions }: RolesManagerProps) {
  const supabase = createClient()
  const router = useRouter()
  const { t } = useTranslation()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Group permissions by their scope prefix (e.g., "guests", "scanner")
  const permissionGroups = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const group = perm.scope.includes('.') ? perm.scope.split('.')[0] : 'other'
    if (!acc[group]) acc[group] = []
    acc[group].push(perm)
    return acc
  }, {})

  const openCreate = () => setEditState(EMPTY_EDIT)

  const openEdit = (role: RoleWithPermissions) => {
    setEditState({
      roleId: role.id,
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.role_permissions.map((rp) => rp.permission_id),
    })
  }

  const closeEdit = () => setEditState(null)

  const togglePermission = (permId: string) => {
    if (!editState) return
    setEditState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        permissionIds: prev.permissionIds.includes(permId)
          ? prev.permissionIds.filter((id) => id !== permId)
          : [...prev.permissionIds, permId],
      }
    })
  }

  const handleSave = async () => {
    if (!editState || !editState.name.trim()) return
    setIsSaving(true)
    try {
      if (editState.roleId) {
        await Promise.all([
          updateRole(supabase, editState.roleId, editState.name.trim(), editState.description || null),
          updateRolePermissions(supabase, editState.roleId, editState.permissionIds),
        ])
      } else {
        // Create role first, then assign permissions
        const { data } = await supabase
          .from('roles')
          .insert({ name: editState.name.trim(), description: editState.description || null })
          .select('id')
          .single()
        if (data && editState.permissionIds.length > 0) {
          await updateRolePermissions(supabase, data.id, editState.permissionIds)
        }
      }
      router.refresh()
      closeEdit()
      toast({ title: t('settings.roles_section.roleSaved') })
    } catch (error) {
      console.error('Error saving role:', error)
      toast({ title: t('common.error'), description: t('settings.roles_section.roleSaveError'), variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingRoleId) return
    try {
      await deleteRole(supabase, deletingRoleId)
      router.refresh()
      toast({ title: t('settings.roles_section.roleDeleted') })
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({ title: t('common.error'), description: t('settings.roles_section.roleDeleteError'), variant: 'destructive' })
    } finally {
      setDeletingRoleId(null)
    }
  }

  const deletingRole = roles.find((r) => r.id === deletingRoleId)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('settings.roles_section.title')}</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('settings.roles_section.createRole')}
          </Button>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('settings.roles_section.noRoles')}
            </p>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{role.name}</p>
                      {role.description && (
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {role.role_permissions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {t('settings.roles_section.noPermissions')}
                          </span>
                        ) : (
                          <>
                            {role.role_permissions.slice(0, 3).map((rp) => (
                              <Badge key={rp.permission_id} variant="secondary" className="text-xs">
                                {rp.permissions.scope}
                              </Badge>
                            ))}
                            {role.role_permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.role_permissions.length - 3}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(role)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingRoleId(role.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={!!editState} onOpenChange={(open) => { if (!open) closeEdit() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editState?.roleId
                ? t('settings.roles_section.editRole')
                : t('settings.roles_section.createRole')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('settings.roles_section.editRoleDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="role-name">{t('settings.roles_section.roleName')}</Label>
              <Input
                id="role-name"
                value={editState?.name ?? ''}
                onChange={(e) => setEditState((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder={t('settings.roles_section.roleNamePlaceholder')}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="role-desc">{t('settings.roles_section.roleDescription')}</Label>
              <Textarea
                id="role-desc"
                rows={2}
                value={editState?.description ?? ''}
                onChange={(e) => setEditState((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                placeholder={t('settings.roles_section.roleDescriptionPlaceholder')}
              />
            </div>

            <Separator />

            {/* Permissions grouped by prefix */}
            <div className="space-y-3">
              <Label>{t('settings.roles_section.permissions')}</Label>
              {Object.entries(permissionGroups).map(([group, perms]) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </p>
                  <div className="space-y-1.5 rounded-md border border-border p-3">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`perm-${perm.id}`}
                          checked={editState?.permissionIds.includes(perm.id) ?? false}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <div>
                          <Label htmlFor={`perm-${perm.id}`} className="cursor-pointer text-sm">
                            {perm.scope}
                          </Label>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeEdit} disabled={isSaving}>
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving || !editState?.name.trim()}
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRoleId} onOpenChange={(open) => { if (!open) setDeletingRoleId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.roles_section.deleteRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.roles_section.deleteRoleConfirm', { name: deletingRole?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
