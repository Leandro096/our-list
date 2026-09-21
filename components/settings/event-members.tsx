'use client';

import { useTransition } from 'react';
import { User, CalendarDays } from 'lucide-react';

import type { TenantMemberWithUser } from '@/lib/types';

import type { EventMemberWithUser } from '@/services/event-member.service';

import { toast } from '@/hooks';
import {
  assignEventMemberAction,
  removeEventMemberAction,
} from '@/app/dashboard/settings/members/actions';

import {
  Card,
  Badge,
  Button,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from '@/components/ui';

interface Props {
  members: TenantMemberWithUser[];
  assignments: EventMemberWithUser[];
  eventName: string;
}

const FULL_ACCESS_ROLES = new Set(['owner', 'admin']);

/**
 * Assigns tenant members to the active event. Owners/admins already see every
 * event (enforced by RLS), so they are shown as having full access without a
 * toggle. Coordinators/viewers only see events they are assigned to here.
 */
export function EventMembersManager({ members, assignments, eventName }: Props) {
  const [isPending, startTransition] = useTransition();

  // tenant_member_id -> event_members row id
  const assignedById = new Map<string, string>();
  for (const a of assignments) {
    if (a.tenant_member_id) assignedById.set(a.tenant_member_id, a.id);
  }

  const toggle = (memberId: string, assignmentId: string | undefined) => {
    startTransition(async () => {
      const res = assignmentId
        ? await removeEventMemberAction(assignmentId)
        : await assignEventMemberAction(memberId);
      if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          Acceso al evento
        </CardTitle>
        <CardDescription>
          Define qué miembros pueden ver y trabajar en el evento <strong>{eventName}</strong>. Los
          propietarios y administradores tienen acceso a todos los eventos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin miembros aún.</p>
        ) : (
          members.map((m) => {
            const u = m.user as { display_name?: string | null; email?: string } | undefined;
            const roleName = (m.role as { name?: string } | undefined)?.name ?? '';
            const fullAccess = FULL_ACCESS_ROLES.has(roleName);
            const assignmentId = assignedById.get(m.id);
            const isAssigned = Boolean(assignmentId);

            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u?.display_name ?? u?.email ?? 'Usuario'}</p>
                    <p className="truncate text-xs text-muted-foreground">{u?.email}</p>
                  </div>
                  {roleName && <Badge variant="outline">{roleName}</Badge>}
                </div>

                {fullAccess ? (
                  <Badge variant="secondary">Acceso total</Badge>
                ) : (
                  <Button
                    variant={isAssigned ? 'outline' : 'default'}
                    size="sm"
                    disabled={isPending}
                    onClick={() => toggle(m.id, assignmentId)}
                  >
                    {isAssigned ? 'Quitar acceso' : 'Dar acceso'}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
