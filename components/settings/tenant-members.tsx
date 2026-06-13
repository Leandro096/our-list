'use client';

import { useReducer } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { User, Trash2, UserPlus } from 'lucide-react';

import type { Role, TenantMemberWithUser } from '@/lib/types';

import { toast } from '@/hooks';
import { useLocale } from '@/locales';
import { inviteMemberAction, removeMemberAction } from '@/app/dashboard/settings/members/actions';

import {
  Card,
  Badge,
  Input,
  Label,
  Table,
  Button,
  Dialog,
  Select,
  TableRow,
  CardTitle,
  TableBody,
  TableCell,
  TableHead,
  CardHeader,
  SelectItem,
  CardContent,
  DialogTitle,
  SelectValue,
  TableHeader,
  DialogHeader,
  DialogContent,
  SelectContent,
  SelectTrigger,
  DialogDescription,
} from '@/components/ui';

interface Props {
  members: TenantMemberWithUser[];
  roles: Role[];
}

type State = {
  inviteOpen: boolean;
  inviteEmail: string;
  inviteRoleId: string;
  isInviting: boolean;
  removingId: string | null;
};

type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function TenantMembersManager({ members, roles }: Props) {
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'es' ? esLocale : undefined;

  const [state, dispatch] = useReducer(reducer, {
    inviteOpen: false,
    inviteEmail: '',
    inviteRoleId: roles[0]?.id ?? '',
    isInviting: false,
    removingId: null,
  });

  const { inviteOpen, inviteEmail, inviteRoleId, isInviting, removingId } = state;
  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    update({ isInviting: true });
    const result = await inviteMemberAction(inviteEmail, inviteRoleId);
    update({ isInviting: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Invitación enviada', description: `Invitación enviada a ${inviteEmail}.` });
      update({ inviteOpen: false, inviteEmail: '' });
    }
  };

  const handleRemove = async (memberId: string) => {
    update({ removingId: memberId });
    const result = await removeMemberAction(memberId);
    update({ removingId: null });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Miembro eliminado.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(v) => update({ inviteOpen: v })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar miembro</DialogTitle>
            <DialogDescription>
              Ingresa el correo del miembro a invitar y asígnale un rol.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Correo electrónico</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="miembro@ejemplo.com"
                required
                value={inviteEmail}
                onChange={(e) => update({ inviteEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Rol</Label>
              <Select value={inviteRoleId} onValueChange={(v) => update({ inviteRoleId: v })}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => update({ inviteOpen: false })}
                disabled={isInviting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isInviting}>
                {isInviting ? 'Enviando...' : 'Enviar invitación'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Miembros</CardTitle>
          <Button size="sm" onClick={() => update({ inviteOpen: true })}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar miembro
          </Button>
        </CardHeader>
        <CardContent>
          {/* Mobile */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {members.length === 0 ? (
              <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                Sin miembros aún.
              </p>
            ) : (
              members.map((m) => {
                const u = m.user as { display_name?: string | null; email?: string } | undefined;
                const r = m.role as { name?: string } | undefined;
                return (
                  <div key={m.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {u?.display_name ?? u?.email ?? 'Usuario'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u?.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        disabled={removingId === m.id}
                        onClick={() => handleRemove(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {r?.name && <Badge variant="outline">{r.name}</Badge>}
                      <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                        {m.status === 'active' ? 'Activo' : 'Invitado'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), {
                        addSuffix: true,
                        locale: dateFnsLocale,
                      })}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop */}
          <div className="hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miembro</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Se unió</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Sin miembros aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => {
                    const u = m.user as
                      | { display_name?: string | null; email?: string }
                      | undefined;
                    const r = m.role as { name?: string } | undefined;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{u?.display_name ?? 'Usuario'}</p>
                              <p className="text-xs text-muted-foreground">{u?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r?.name ? <Badge variant="outline">{r.name}</Badge> : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                            {m.status === 'active' ? 'Activo' : 'Invitado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), {
                            addSuffix: true,
                            locale: dateFnsLocale,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={removingId === m.id}
                            onClick={() => handleRemove(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
