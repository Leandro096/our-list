'use client';

import { useReducer } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { PlatformRole } from '@/lib/types';

import type {
  PlatformUserWithRoles,
  PlatformRoleWithPermissions,
} from '@/services/platform.service';

import { toast } from '@/hooks';
import { assignPlatformRoleAction, revokePlatformRoleAction } from '@/app/admin/roles/actions';

import {
  Card,
  Badge,
  Input,
  Label,
  Button,
  Dialog,
  Select,
  CardTitle,
  CardHeader,
  SelectItem,
  CardContent,
  DialogTitle,
  SelectValue,
  DialogHeader,
  DialogContent,
  SelectContent,
  SelectTrigger,
  DialogDescription,
} from '@/components/ui';

interface Props {
  roles: PlatformRoleWithPermissions[];
  users: PlatformUserWithRoles[];
}

type State = {
  assignOpen: boolean;
  userId: string;
  roleId: string;
  isLoading: boolean;
};
type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function RolesManager({ roles, users }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    assignOpen: false,
    userId: '',
    roleId: '',
    isLoading: false,
  });
  const { assignOpen, userId, roleId, isLoading } = state;
  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !roleId) return;
    update({ isLoading: true });
    const result = await assignPlatformRoleAction(userId.trim(), roleId);
    update({ isLoading: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Rol asignado.' });
      update({ assignOpen: false, userId: '', roleId: '' });
      router.refresh();
    }
  };

  const handleRevoke = async (uid: string, rid: string) => {
    const result = await revokePlatformRoleAction(uid, rid);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Rol revocado.' });
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Roles catalogue */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{role.name}</CardTitle>
              {role.description && (
                <p className="text-xs text-muted-foreground">{role.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {role.permissions.map((p) => (
                  <Badge key={p.id} variant="secondary" className="text-xs">
                    {p.scope}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users with platform roles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Usuarios con roles de plataforma</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => update({ assignOpen: true })}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Asignar rol
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ningún usuario tiene roles de plataforma asignados.
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name ?? u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <div key={r.id} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {r.name}
                        </Badge>
                        <button
                          onClick={() => handleRevoke(u.id, r.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Revocar rol"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={(v) => !v && update({ assignOpen: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rol de plataforma</DialogTitle>
            <DialogDescription>
              Ingresa el UUID del usuario y selecciona el rol a asignar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="user-id">UUID del usuario</Label>
              <Input
                id="user-id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={userId}
                onChange={(e) => update({ userId: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={roleId} onValueChange={(v) => update({ roleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol…" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r: PlatformRole) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => update({ assignOpen: false })}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading || !roleId}>
                {isLoading ? 'Asignando…' : 'Asignar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
