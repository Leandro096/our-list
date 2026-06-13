'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';

import type { Plan } from '@/lib/types';

import { toast } from '@/hooks';
import {
  suspendTenantAction,
  changeTenantPlanAction,
  reactivateTenantAction,
} from '@/app/admin/tenants/actions';

import {
  Button,
  Dialog,
  Select,
  SelectItem,
  DialogTitle,
  SelectValue,
  DialogHeader,
  DialogContent,
  SelectContent,
  SelectTrigger,
  DialogDescription,
} from '@/components/ui';

interface Props {
  tenantId: string;
  tenantName: string;
  status: string;
  currentPlanCode: string | null;
  plans: Plan[];
  canManage: boolean;
}

type Modal = 'suspend' | 'reactivate' | 'plan' | null;
type State = { modal: Modal; selectedPlanId: string; isLoading: boolean };
type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function TenantActions({ tenantId, tenantName, status, plans, canManage }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    modal: null,
    selectedPlanId: '',
    isLoading: false,
  });
  const { modal, selectedPlanId, isLoading } = state;
  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleSuspend = async () => {
    update({ isLoading: true });
    const result = await suspendTenantAction(tenantId);
    update({ isLoading: false, modal: null });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: `"${tenantName}" suspendido.` });
      router.refresh();
    }
  };

  const handleReactivate = async () => {
    update({ isLoading: true });
    const result = await reactivateTenantAction(tenantId);
    update({ isLoading: false, modal: null });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: `"${tenantName}" reactivado.` });
      router.refresh();
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanId) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;
    update({ isLoading: true });
    const result = await changeTenantPlanAction(tenantId, plan.id, plan.billing_type);
    update({ isLoading: false, modal: null });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: `Plan actualizado a "${plan.name}".` });
      router.refresh();
    }
  };

  if (!canManage) return null;

  return (
    <>
      <div className="flex items-center gap-1">
        {status === 'active' ? (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => update({ modal: 'suspend' })}
          >
            Suspender
          </Button>
        ) : status === 'suspended' ? (
          <Button size="sm" variant="outline" onClick={() => update({ modal: 'reactivate' })}>
            Reactivar
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => update({ modal: 'plan' })}>
          Cambiar plan
        </Button>
      </div>

      {/* Suspend */}
      <Dialog open={modal === 'suspend'} onOpenChange={(v) => !v && update({ modal: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender tenant</DialogTitle>
            <DialogDescription>
              ¿Confirmas suspender <strong>{tenantName}</strong>? Los usuarios no podrán acceder al
              workspace hasta que se reactive.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
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
              onClick={handleSuspend}
              disabled={isLoading}
            >
              {isLoading ? 'Suspendiendo...' : 'Suspender'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reactivate */}
      <Dialog open={modal === 'reactivate'} onOpenChange={(v) => !v && update({ modal: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivar tenant</DialogTitle>
            <DialogDescription>
              ¿Confirmas reactivar <strong>{tenantName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => update({ modal: null })}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleReactivate} disabled={isLoading}>
              {isLoading ? 'Reactivando...' : 'Reactivar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change plan */}
      <Dialog open={modal === 'plan'} onOpenChange={(v) => !v && update({ modal: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar plan — {tenantName}</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo plan. Se cancelará la suscripción activa y se activará la nueva
              sin cobro (override de admin).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedPlanId} onValueChange={(v) => update({ selectedPlanId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan…" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.price_currency} {p.price_amount}{' '}
                    {p.billing_type === 'one_time' ? 'único' : '/mes'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                className="flex-1"
                onClick={handleChangePlan}
                disabled={isLoading || !selectedPlanId}
              >
                {isLoading ? 'Guardando...' : 'Aplicar plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
