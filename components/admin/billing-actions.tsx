'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, CheckCircle2 } from 'lucide-react';

import { toast } from '@/hooks';
import { rejectPaymentAction, confirmPaymentAction } from '@/app/admin/billing/actions';

import {
  Label,
  Button,
  Dialog,
  Textarea,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui';

interface Props {
  paymentId: string;
  canConfirm: boolean;
  canReject: boolean;
}

type Modal = 'confirm' | 'reject' | null;

type State = {
  modal: Modal;
  notes: string;
  reason: string;
  isLoading: boolean;
};

type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function AdminBillingActions({ paymentId, canConfirm, canReject }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    modal: null,
    notes: '',
    reason: '',
    isLoading: false,
  });

  const { modal, notes, reason, isLoading } = state;
  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleConfirm = async () => {
    update({ isLoading: true });
    try {
      const result = await confirmPaymentAction(paymentId, notes.trim() || null);
      if (result.ok) {
        toast({ description: 'Pago confirmado. Suscripción activada.' });
        update({ modal: null, notes: '' });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'La acción falló.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'La acción falló.', variant: 'destructive' });
    } finally {
      update({ isLoading: false });
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      toast({ description: 'El motivo es requerido.', variant: 'destructive' });
      return;
    }
    update({ isLoading: true });
    try {
      const result = await rejectPaymentAction(paymentId, reason.trim());
      if (result.ok) {
        toast({ description: 'Pago rechazado.' });
        update({ modal: null, reason: '' });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'La acción falló.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'La acción falló.', variant: 'destructive' });
    } finally {
      update({ isLoading: false });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {canConfirm && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => update({ modal: 'confirm' })}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          Confirmar
        </Button>
      )}
      {canReject && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => update({ modal: 'reject' })}
        >
          <XCircle className="h-3.5 w-3.5 text-destructive" />
          Rechazar
        </Button>
      )}

      {/* Confirm dialog */}
      <Dialog open={modal === 'confirm'} onOpenChange={(v) => !v && update({ modal: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago</DialogTitle>
            <DialogDescription>
              Esto activará la suscripción del tenant. Puedes agregar notas opcionales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-notes">Notas (opcional)</Label>
              <Textarea
                id="confirm-notes"
                placeholder="Notas para el registro..."
                value={notes}
                onChange={(e) => update({ notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => update({ modal: null })}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Confirmando...' : 'Confirmar pago'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={modal === 'reject'} onOpenChange={(v) => !v && update({ modal: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar pago</DialogTitle>
            <DialogDescription>
              El tenant deberá reenviar el comprobante. Indica el motivo del rechazo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivo del rechazo</Label>
              <Textarea
                id="reject-reason"
                placeholder="Ej: El monto no coincide con el plan seleccionado."
                value={reason}
                onChange={(e) => update({ reason: e.target.value })}
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => update({ modal: null })}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={isLoading}
              >
                {isLoading ? 'Rechazando...' : 'Rechazar pago'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
