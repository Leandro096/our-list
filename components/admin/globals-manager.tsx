'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import type { GuestStatus, EventSession } from '@/lib/types';

import { toast } from '@/hooks';
import {
  deleteStatusAction,
  updateStatusAction,
  deleteSessionAction,
  updateSessionAction,
  createGlobalStatusAction,
  createGlobalSessionAction,
} from '@/app/admin/globals/actions';

import { Card, Input, Label, Button, CardTitle, CardHeader, CardContent } from '@/components/ui';

// ── Status item ──────────────────────────────────────────────

function StatusRow({ status, onDelete }: { status: GuestStatus; onDelete: (id: string) => void }) {
  const router = useRouter();
  const [editing, setEditing] = useReducer((s: boolean) => !s, false);
  const [label, setLabel] = useReducer((_: string, v: string) => v, status.label);
  const [color, setColor] = useReducer((_: string, v: string) => v, status.color);
  const [saving, setSaving] = useReducer((s: boolean) => !s, false);

  const save = async () => {
    setSaving();
    const result = await updateStatusAction(status.id, { label, color });
    setSaving();
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setEditing();
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: status.color }}
      />
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-7 text-sm" />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
          <Button size="sm" className="h-7" onClick={save} disabled={saving}>
            OK
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={setEditing}>
            ✕
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{status.label}</span>
          <span className="text-xs text-muted-foreground">{status.key}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={setEditing}>
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
    </div>
  );
}

// ── Session item ──────────────────────────────────────────────

function SessionRow({
  session,
  onDelete,
}: {
  session: EventSession;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useReducer((s: boolean) => !s, false);
  const [label, setLabel] = useReducer((_: string, v: string) => v, session.label);
  const [saving, setSaving] = useReducer((s: boolean) => !s, false);

  const save = async () => {
    setSaving();
    const result = await updateSessionAction(session.id, { label });
    setSaving();
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setEditing();
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-7 text-sm" />
          <Button size="sm" className="h-7" onClick={save} disabled={saving}>
            OK
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={setEditing}>
            ✕
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{session.label}</span>
          <span className="text-xs text-muted-foreground">{session.key}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={setEditing}>
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
    </div>
  );
}

// ── New status form ───────────────────────────────────────────

function NewStatusForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  type S = { key: string; label: string; color: string; saving: boolean };
  const [s, dispatch] = useReducer((state: S, patch: Partial<S>) => ({ ...state, ...patch }), {
    key: '',
    label: '',
    color: '#6366f1',
    saving: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.key.trim() || !s.label.trim()) return;
    dispatch({ saving: true });
    const result = await createGlobalStatusAction({ key: s.key, label: s.label, color: s.color });
    dispatch({ saving: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Estado global creado.' });
      router.refresh();
      onDone();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dashed border-border p-3"
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Key (slug)</Label>
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
            className="h-7 w-full cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7" disabled={s.saving}>
          {s.saving ? 'Guardando…' : 'Crear estado'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ── New session form ──────────────────────────────────────────

function NewSessionForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  type S = { key: string; label: string; saving: boolean };
  const [s, dispatch] = useReducer((state: S, patch: Partial<S>) => ({ ...state, ...patch }), {
    key: '',
    label: '',
    saving: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.key.trim() || !s.label.trim()) return;
    dispatch({ saving: true });
    const result = await createGlobalSessionAction({ key: s.key, label: s.label });
    dispatch({ saving: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Sesión global creada.' });
      router.refresh();
      onDone();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dashed border-border p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Key (slug)</Label>
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
          {s.saving ? 'Guardando…' : 'Crear sesión'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────

interface Props {
  statuses: GuestStatus[];
  sessions: EventSession[];
}

type UIState = { addStatus: boolean; addSession: boolean };
type UIAction = { type: 'UPDATE'; payload: Partial<UIState> };

function uiReducer(state: UIState, action: UIAction): UIState {
  return { ...state, ...action.payload };
}

export function GlobalsManager({ statuses, sessions }: Props) {
  const router = useRouter();
  const [ui, dispatchUI] = useReducer(uiReducer, { addStatus: false, addSession: false });
  const updateUI = (payload: Partial<UIState>) => dispatchUI({ type: 'UPDATE', payload });

  const handleDeleteStatus = async (id: string) => {
    const result = await deleteStatusAction(id);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Estado eliminado.' });
      router.refresh();
    }
  };

  const handleDeleteSession = async (id: string) => {
    const result = await deleteSessionAction(id);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Sesión eliminada.' });
      router.refresh();
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Statuses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Estados de invitado</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => updateUI({ addStatus: !ui.addStatus })}
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {ui.addStatus && <NewStatusForm onDone={() => updateUI({ addStatus: false })} />}
          {statuses.map((s) => (
            <StatusRow key={s.id} status={s} onDelete={handleDeleteStatus} />
          ))}
          {statuses.length === 0 && !ui.addStatus && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay estados globales.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Sesiones de evento</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => updateUI({ addSession: !ui.addSession })}
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {ui.addSession && <NewSessionForm onDone={() => updateUI({ addSession: false })} />}
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onDelete={handleDeleteSession} />
          ))}
          {sessions.length === 0 && !ui.addSession && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay sesiones globales.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
