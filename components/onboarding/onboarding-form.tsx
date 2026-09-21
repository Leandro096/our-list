'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Users, Building2, CalendarCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Plan, TenantType } from '@/lib/types';

import { toast } from '@/hooks';
import { createWorkspaceAction } from '@/app/onboarding/actions';

import { Card, Input, Label, Button, CardContent } from '@/components/ui';

interface Props {
  plans: Plan[];
  defaultName: string;
  defaultType: TenantType;
}

function formatPrice(plan: Plan): string {
  const amount = new Intl.NumberFormat('es', {
    style: 'currency',
    currency: plan.price_currency || 'USD',
    maximumFractionDigits: 0,
  }).format(plan.price_amount);
  return plan.billing_type === 'recurring' ? `${amount}/mes` : `${amount} pago único`;
}

export function OnboardingForm({ plans, defaultName, defaultType }: Props) {
  const router = useRouter();
  const [type, setType] = useState<TenantType>(defaultType);
  const [name, setName] = useState(defaultName);
  const [planId, setPlanId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visiblePlans = useMemo(() => plans.filter((p) => p.scope === type), [plans, type]);

  // Keep a valid plan selected as the type filter changes.
  const selectedPlanId = useMemo(() => {
    if (planId && visiblePlans.some((p) => p.id === planId)) return planId;
    return visiblePlans[0]?.id ?? '';
  }, [planId, visiblePlans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Falta el nombre', description: 'Ingresa un nombre para tu workspace.', variant: 'destructive' });
      return;
    }
    if (!selectedPlanId) {
      toast({ title: 'Selecciona un plan', description: 'Elige un plan para continuar.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const result = await createWorkspaceAction({ name: name.trim(), planId: selectedPlanId });
    if (result.error) {
      setIsSubmitting(false);
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    // Workspace ready — go complete payment for the selected plan.
    router.replace('/dashboard/settings/billing');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account type */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { value: 'individual', label: 'Personal', icon: CalendarCheck, hint: 'Para 1 evento' },
            { value: 'organization', label: 'Organización', icon: Users, hint: 'Equipo y varios eventos' },
          ] as const
        ).map((opt) => {
          const active = type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-accent/50'
              )}
            >
              <opt.icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <div>
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Workspace name */}
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Nombre del workspace</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'organization' ? 'Mi Organización' : 'Mi Boda'}
          required
        />
      </div>

      {/* Plan selection */}
      <div className="space-y-3">
        <Label>Elige un plan</Label>
        {visiblePlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay planes disponibles para este tipo.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visiblePlans.map((plan) => {
              const active = selectedPlanId === plan.id;
              return (
                <Card
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPlanId(plan.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPlanId(plan.id);
                    }
                  }}
                  className={cn(
                    'cursor-pointer transition-colors',
                    active ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent/30'
                  )}
                >
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{plan.name}</span>
                      </div>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-lg font-semibold">{formatPrice(plan)}</p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    )}
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      <li>
                        {plan.max_events === 999 ? 'Eventos ilimitados' : `${plan.max_events} evento(s)`}
                      </li>
                      <li>Hasta {plan.max_guests_per_event} invitados/evento</li>
                      <li>{plan.max_members} miembro(s)</li>
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !selectedPlanId}>
        {isSubmitting ? 'Creando workspace…' : 'Crear workspace y continuar'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Tu suscripción quedará pendiente hasta completar el pago en el siguiente paso.
      </p>
    </form>
  );
}
