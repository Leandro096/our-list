'use client';

import { useReducer } from 'react';
import { Zap, Check } from 'lucide-react';

import type { PlanWithFeatures } from '@/lib/types';

import { toast } from '@/hooks';
import {
  createPortalSessionAction,
  createCheckoutSessionAction,
} from '@/app/dashboard/settings/billing/actions';

import { Card, Badge, Button, CardTitle, CardHeader, CardContent } from '@/components/ui';

interface Props {
  plans: PlanWithFeatures[];
  currentPlanCode: string | null;
  hasStripeCustomer: boolean;
}

type State = { loadingPlanId: string | null; loadingPortal: boolean };
type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function StripePlanSelector({ plans, currentPlanCode, hasStripeCustomer }: Props) {
  const [state, dispatch] = useReducer(reducer, { loadingPlanId: null, loadingPortal: false });
  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleCheckout = async (planId: string) => {
    update({ loadingPlanId: planId });
    const result = await createCheckoutSessionAction(planId);
    update({ loadingPlanId: null });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    if (result.url) {
      window.location.assign(result.url);
    }
  };

  const handlePortal = async () => {
    update({ loadingPortal: true });
    const result = await createPortalSessionAction();
    update({ loadingPortal: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    if (result.url) {
      window.location.assign(result.url);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Planes disponibles</h2>
        {hasStripeCustomer && (
          <Button variant="outline" size="sm" onClick={handlePortal} disabled={state.loadingPortal}>
            {state.loadingPortal ? 'Abriendo...' : 'Gestionar suscripción'}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const isLoading = state.loadingPlanId === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${isCurrent ? 'border-primary ring-1 ring-primary' : ''}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Plan actual</Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {plan.price_currency} {plan.price_amount}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.billing_type === 'one_time' ? 'único' : '/mes'}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex-1 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {plan.max_events === 999999
                      ? 'Eventos ilimitados'
                      : `${plan.max_events} evento${plan.max_events !== 1 ? 's' : ''}`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {plan.max_guests_per_event} invitados/evento
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {plan.max_members === 1 ? '1 usuario' : `${plan.max_members} miembros`}
                  </li>
                  {(plan.features ?? []).map((f) => (
                    <li key={f.id} className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                      {f.name}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || isLoading || state.loadingPlanId !== null}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {isLoading ? 'Redirigiendo...' : isCurrent ? 'Plan actual' : 'Seleccionar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
