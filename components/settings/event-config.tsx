'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import type { GuestStatus, EventSession } from '@/lib/types';

import { toast } from '@/hooks';
import {
  createCustomStatusAction,
  deleteCustomStatusAction,
  updateCustomStatusAction,
  createCustomSessionAction,
  deleteCustomSessionAction,
  updateCustomSessionAction,
} from '@/app/dashboard/settings/event/actions';

import { Card, Input, Label, Button, CardTitle, CardHeader, CardContent } from '@/components/ui';

// ── Status row ────────────────────────────────────────────────

function StatusRow({ status, onDelete }: { status: GuestStatus; onDelete: (id: string) => void }) {
  const router = useRouter();
  type S = { editing: boolean; label: string; color: string; saving: boolean };
  const [s, dispatch] = useReducer((state: S, patch: Partial<S>) => ({ ...state, ...patch }), {
    editing: false,
    label: status.label,
    color: status.color,
    saving: false,
  });

  const save = async () => {
    dispatch({ saving: true });
    const result = await updateCustomStatusAction(status.id, { label: s.label, color: s.color });
    dispatch({ saving: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      dispatch({ editing: false });
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
      {s.editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={s.label}
            onChange={(e) => dispatch({ label: e.target.value })}
            className="h-7 text-sm"
          />
          <input
            type="color"
            value={s.color}
            onChange={(e) => dispatch({ color: e.target.value })}
            className="h-7 w-10 cursor-pointer rounded border border-border p-0.5"
          />
          <Button size="sm" className="h-7" onClick={save} disabled={s.saving}>
            OK
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => dispatch({ editing: false })}
          >
            ✕
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{status.label}</span>
          <span className="text-xs text-muted-foreground">{status.key}</span>
          {status.is_global ? (
            <span className="text-xs text-muted-foreground">(global)</span>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => dispatch({ editing: true })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(status.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Session row ───────────────────────────────────────────────

function SessionRow({
  session,
  onDelete,
}: {
  session: EventSession;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  type S = { editing: boolean; label: string; saving: boolean };
  const [s, dispatch] = useReducer((state: S, patch: Partial<S>) => ({ ...state, ...patch }), {
    editing: false,
    label: session.label,
    saving: false,
  });

  const save = async () => {
    dispatch({ saving: true });
    const result = await updateCustomSessionAction(session.id, { label: s.label });
    dispatch({ saving: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      dispatch({ editing: false });
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      {s.editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={s.label}
            onChange={(e) => dispatch({ label: e.target.value })}
            className="h-7 text-sm"
          />
          <Button size="sm" className="h-7" onClick={save} disabled={s.saving}>
            OK
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => dispatch({ editing: false })}
          >
            ✕
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{session.label}</span>
          <span className="text-xs text-muted-foreground">{session.key}</span>
          {session.is_global ? (
            <span className="text-xs text-muted-foreground">(global)</span>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => dispatch({ editing: true })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(session.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Add forms ─────────────────────────────────────────────────

function NewStatusForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  type S = { key: string; label: string; color: string; saving: boolean };
  const [s, dispatch] = useReducer((state: S, p: Partial<S>) => ({ ...state, ...p }), {
    key: '',
    label: '',
    color: '#6366f1',
    saving: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.key || !s.label) return;
    dispatch({ saving: true });
    const result = await createCustomStatusAction({ key: s.key, label: s.label, color: s.color });
    dispatch({ saving: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Estado creado.' });
      router.refresh();
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Key</Label>
          <Input
            placeholder="ej: vip"
            value={s.key}
            onChange={(e) => dispatch({ key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            className="h-7 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Etiqueta</Label>
          <Input
            placeholder="ej: VIP"
            value={s.label}
            onChange={(e) => dispatch({ label: e.target.value })}
            className="h-7 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Color</Label>
          <input
            type="color"
            value={s.color}
            onChange={(e) => dispatch({ color: e.target.value })}
            className="h-7 w-full cursor-pointer rounded border border-border p-0.5"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7" disabled={s.saving}>
          {s.saving ? 'Guardando…' : 'Crear'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function NewSessionForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  type S = { key: string; label: string; saving: boolean };
  const [s, dispatch] = useReducer((state: S, p: Partial<S>) => ({ ...state, ...p }), {
    key: '',
    label: '',
    saving: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.key || !s.label) return;
    dispatch({ saving: true });
    const result = await createCustomSessionAction({ key: s.key, label: s.label });
    dispatch({ saving: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Sesión creada.' });
      router.refresh();
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Key</Label>
          <Input
            placeholder="ej: cocktail"
            value={s.key}
            onChange={(e) => dispatch({ key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            className="h-7 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Etiqueta</Label>
          <Input
            placeholder="ej: Cocktail"
            value={s.label}
            onChange={(e) => dispatch({ label: e.target.value })}
            className="h-7 text-sm"
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7" disabled={s.saving}>
          {s.saving ? 'Guardando…' : 'Crear'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ── Main ──────────────────────────────────────────────────────

interface Props {
  statuses: GuestStatus[];
  sessions: EventSession[];
  canEditStatuses: boolean;
  canEditSessions: boolean;
}

export function EventConfig({ statuses, sessions, canEditStatuses, canEditSessions }: Props) {
  const router = useRouter();
  type UI = { addStatus: boolean; addSession: boolean };
  const [ui, setUI] = useReducer((state: UI, patch: Partial<UI>) => ({ ...state, ...patch }), {
    addStatus: false,
    addSession: false,
  });

  const handleDeleteStatus = async (id: string) => {
    const result = await deleteCustomStatusAction(id);
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else {
      toast({ description: 'Estado eliminado.' });
      router.refresh();
    }
  };

  const handleDeleteSession = async (id: string) => {
    const result = await deleteCustomSessionAction(id);
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else {
      toast({ description: 'Sesión eliminada.' });
      router.refresh();
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Estados de invitado</CardTitle>
          {canEditStatuses && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={() => setUI({ addStatus: !ui.addStatus })}
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {ui.addStatus && <NewStatusForm onDone={() => setUI({ addStatus: false })} />}
          {statuses.map((s) => (
            <StatusRow key={s.id} status={s} onDelete={handleDeleteStatus} />
          ))}
          {statuses.length === 0 && !ui.addStatus && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin estados personalizados.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Sesiones del evento</CardTitle>
          {canEditSessions && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={() => setUI({ addSession: !ui.addSession })}
            >
              <Plus className="h-3.5 w-3.5" /> Nueva
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {ui.addSession && <NewSessionForm onDone={() => setUI({ addSession: false })} />}
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onDelete={handleDeleteSession} />
          ))}
          {sessions.length === 0 && !ui.addSession && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin sesiones personalizadas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
