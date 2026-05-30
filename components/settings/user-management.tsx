'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { User, Crown, Pencil, Shield, UserPlus } from 'lucide-react';

import { toast } from '@/hooks';
import type { Role } from '@/lib';
import { useLocale, useTranslation } from '@/locales';
import type { UserWithRoleAssignments } from '@/services';
import { updateUserRolesAction, updateUserSuperAdminAction } from '@/app/dashboard/settings/actions';

import {
  Card,
  Table,
  Badge,
  Label,
  Button,
  Dialog,
  Switch,
  Checkbox,
  TableRow,
  TableBody,
  Separator,
  TableCell,
  TableHead,
  CardTitle,
  CardHeader,
  DialogTitle,
  CardContent,
  TableHeader,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui';

import { InviteUserDialog } from './invite-user-dialog';

interface UserManagementProps {
  users: UserWithRoleAssignments[];
  roles: Role[];
}

export function UserManagement({ users, roles }: UserManagementProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'es' ? esLocale : undefined;

  const [editingUser, setEditingUser] = useState<UserWithRoleAssignments | null>(null);
  const [editIsSuperAdmin, setEditIsSuperAdmin] = useState(false);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const openEdit = (user: UserWithRoleAssignments) => {
    setEditingUser(user);
    setEditIsSuperAdmin(user.is_super_admin);
    setEditRoleIds(user.user_roles.map((ur) => ur.role_id));
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditIsSuperAdmin(false);
    setEditRoleIds([]);
  };

  const toggleRole = (roleId: string) => {
    setEditRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await Promise.all([
        updateUserSuperAdminAction(editingUser.id, editIsSuperAdmin),
        updateUserRolesAction(editingUser.id, editRoleIds),
      ]);
      closeEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar el usuario.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <InviteUserDialog roles={roles} open={inviteOpen} onOpenChange={setInviteOpen} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('settings.users_section.staffMembers')}</CardTitle>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('settings.users_section.inviteUser')}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Mobile grid */}
          {users.length === 0 ? (
            <p className="h-24 text-center text-sm text-muted-foreground flex items-center justify-center md:hidden">
              {t('settings.users_section.noUsers')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          user.is_super_admin ? 'bg-primary/10' : 'bg-muted'
                        }`}
                      >
                        {user.is_super_admin ? (
                          <Crown className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {user.display_name || t('settings.users_section.unnamedUser')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.is_super_admin && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Crown className="mr-1 h-3 w-3" />
                        {t('settings.users_section.superAdmin')}
                      </Badge>
                    )}
                    {user.user_roles.map((ur) => (
                      <Badge key={ur.role_id} variant="outline">
                        {getRoleIcon(ur.roles.name)}
                        <span className="ml-1">{ur.roles.name}</span>
                      </Badge>
                    ))}
                    {user.user_roles.length === 0 && !user.is_super_admin && (
                      <span className="text-sm text-muted-foreground">
                        {t('settings.users_section.noRoles')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), {
                      addSuffix: true,
                      locale: dateFnsLocale,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.users_section.user')}</TableHead>
                  <TableHead>{t('settings.roles')}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t('settings.users_section.joined')}
                  </TableHead>
                  <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {t('settings.users_section.noUsers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${
                              user.is_super_admin ? 'bg-primary/10' : 'bg-muted'
                            }`}
                          >
                            {user.is_super_admin ? (
                              <Crown className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.display_name || t('settings.users_section.unnamedUser')}
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
                              {t('settings.users_section.superAdmin')}
                            </Badge>
                          )}
                          {user.user_roles.map((ur) => (
                            <Badge key={ur.role_id} variant="outline">
                              {getRoleIcon(ur.roles.name)}
                              <span className="ml-1">{ur.roles.name}</span>
                            </Badge>
                          ))}
                          {user.user_roles.length === 0 && !user.is_super_admin && (
                            <span className="text-sm text-muted-foreground">
                              {t('settings.users_section.noRoles')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDistanceToNow(new Date(user.created_at), {
                          addSuffix: true,
                          locale: dateFnsLocale,
                        })}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.users_section.editUser')}</DialogTitle>
            <DialogDescription>{editingUser?.display_name || editingUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Super Admin toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="super-admin-switch" className="text-sm font-medium">
                  {t('settings.users_section.superAdmin')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.users_section.superAdminDesc')}
                </p>
              </div>
              <Switch
                id="super-admin-switch"
                checked={editIsSuperAdmin}
                onCheckedChange={setEditIsSuperAdmin}
              />
            </div>

            <Separator />

            {/* Roles */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('settings.users_section.availableRoles')}
              </Label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-start gap-3 rounded-md border border-border p-3"
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={editRoleIds.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor={`role-${role.id}`}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {role.name}
                      </Label>
                      {role.description && (
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeEdit} disabled={isSaving}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roles Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.users_section.availableRoles')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div key={role.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  {getRoleIcon(role.name)}
                  <h4 className="font-medium">{role.name}</h4>
                </div>
                {role.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
