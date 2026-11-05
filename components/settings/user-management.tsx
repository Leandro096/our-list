'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { User, Crown, Pencil, Shield, UserPlus, Trash2 } from 'lucide-react';

import { toast } from '@/hooks';
import type { Role } from '@/lib';
import { useLocale, useTranslation } from '@/locales';
import type { UserWithRoleAssignments } from '@/services';
import { updateUserAction, deleteUserAction } from '@/app/dashboard/settings/users/actions';

import {
  Card,
  Input,
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

import { CreateUserDialog } from './create-user-dialog';

interface UserManagementProps {
  users: UserWithRoleAssignments[];
  roles: Role[];
  currentUserId: string;
  canEditSuperAdmin: boolean;
}

function getRoleIcon(roleName: string) {
  switch (roleName.toLowerCase()) {
    case 'admin':
      return <Shield className="h-3 w-3" />;
    default:
      return <User className="h-3 w-3" />;
  }
}

type State = {
  editingUser: UserWithRoleAssignments | null;
  editIsSuperAdmin: boolean;
  editName: string;
  editEmail: string;
  editPassword: string;
  editRoleIds: string[];
  isSaving: boolean;
  inviteOpen: boolean;
};

type Action = { type: 'UPDATE'; payload: Partial<State> } | { type: 'TOGGLE_ROLE'; roleId: string };

function reducer(state: State, action: Action): State {
  if (action.type === 'TOGGLE_ROLE') {
    const ids = state.editRoleIds.includes(action.roleId)
      ? state.editRoleIds.filter((id) => id !== action.roleId)
      : [...state.editRoleIds, action.roleId];
    return { ...state, editRoleIds: ids };
  }
  return { ...state, ...action.payload };
}

export function UserManagement({
  users,
  roles,
  currentUserId,
  canEditSuperAdmin,
}: UserManagementProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'es' ? esLocale : undefined;

  const [state, dispatch] = useReducer(reducer, {
    editingUser: null,
    editIsSuperAdmin: false,
    editName: '',
    editEmail: '',
    editPassword: '',
    editRoleIds: [],
    isSaving: false,
    inviteOpen: false,
  });

  const {
    editingUser,
    editIsSuperAdmin,
    editName,
    editEmail,
    editPassword,
    editRoleIds,
    isSaving,
    inviteOpen,
  } = state;

  const openEdit = (user: UserWithRoleAssignments) => {
    dispatch({
      type: 'UPDATE',
      payload: {
        editingUser: user,
        editIsSuperAdmin: user.is_super_admin,
        editName: user.display_name ?? '',
        editEmail: user.email,
        editPassword: '',
        editRoleIds: user.user_roles.map((ur) => ur.role_id),
      },
    });
  };

  const closeEdit = () => {
    dispatch({
      type: 'UPDATE',
      payload: { editingUser: null, editIsSuperAdmin: false, editPassword: '', editRoleIds: [] },
    });
  };

  const toggleRole = (roleId: string) => {
    dispatch({ type: 'TOGGLE_ROLE', roleId });
  };

  const handleDelete = async () => {
    if (!editingUser) return;
    const name = editingUser.display_name || editingUser.email;
    if (!window.confirm(t('settings.users_section.deleteConfirm').replace('{name}', name))) return;
    dispatch({ type: 'UPDATE', payload: { isSaving: true } });
    try {
      await deleteUserAction(editingUser.id);
      toast({ title: t('settings.users_section.deleteSuccess') });
      closeEdit();
      router.refresh();
    } catch (error) {
      toast({
        title: t('settings.users_section.deleteError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'UPDATE', payload: { isSaving: false } });
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;
    dispatch({ type: 'UPDATE', payload: { isSaving: true } });
    try {
      await updateUserAction({
        userId: editingUser.id,
        displayName: editName,
        email: editEmail,
        password: editPassword || undefined,
        roleIds: editRoleIds,
        isSuperAdmin: editIsSuperAdmin,
      });
      closeEdit();
      router.refresh();
    } catch (error) {
      toast({
        title: t('settings.users_section.updateError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'UPDATE', payload: { isSaving: false } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <CreateUserDialog
        roles={roles}
        open={inviteOpen}
        onOpenChange={(v) => dispatch({ type: 'UPDATE', payload: { inviteOpen: v } })}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('settings.users_section.staffMembers')}</CardTitle>
          <Button
            size="sm"
            onClick={() => dispatch({ type: 'UPDATE', payload: { inviteOpen: true } })}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t('settings.users_section.createUser')}
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
                          user.is_super_admin ? 'bg-secondary' : 'bg-muted'
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
                              user.is_super_admin ? 'bg-secondary' : 'bg-muted'
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
            {/* Profile */}
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t('settings.users_section.createName')}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE', payload: { editName: e.target.value } })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">{t('settings.users_section.createEmail')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE', payload: { editEmail: e.target.value } })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-password">
                  {t('settings.users_section.createPasswordKeep')}
                </Label>
                <Input
                  id="edit-password"
                  autoComplete="new-password"
                  value={editPassword}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE', payload: { editPassword: e.target.value } })
                  }
                />
              </div>
            </div>

            <Separator />

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
                disabled={!canEditSuperAdmin || editingUser?.id === currentUserId}
                onCheckedChange={(v) =>
                  dispatch({ type: 'UPDATE', payload: { editIsSuperAdmin: !!v } })
                }
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
              {editingUser && editingUser.id !== currentUserId && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={handleDelete}
                  disabled={isSaving}
                  aria-label={t('settings.users_section.deleteUser')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
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
