import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { es as esLocale } from 'date-fns/locale';
import { Clock, XCircle, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getActiveContext } from '@/lib/server-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

import { getTenantById } from '@/services/tenant.service';
import { getAllPlansWithFeatures } from '@/services/plan.service';
import {
  getSignedProofUrl,
  getPaymentsForTenant,
  getActiveSubscription,
} from '@/services/billing.service';

import { BillingProofForm } from '@/components/settings/billing-proof-form';
import { StripePlanSelector } from '@/components/settings/stripe-plan-selector';
import {
  Card,
  Badge,
  Table,
  TableRow,
  CardTitle,
  TableBody,
  TableCell,
  TableHead,
  CardHeader,
  CardContent,
  TableHeader,
  CardDescription,
} from '@/components/ui';

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === 'confirmed')
    return (
      <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
        <CheckCircle2 className="h-3 w-3" />
        Confirmado
      </Badge>
    );
  if (status === 'rejected')
    return (
      <Badge
        variant="outline"
        className="gap-1 text-destructive border-destructive/20 bg-destructive/5"
      >
        <XCircle className="h-3 w-3" />
        Rechazado
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-200 bg-yellow-50">
      <Clock className="h-3 w-3" />
      En revisión
    </Badge>
  );
}

export default async function BillingPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getActiveContext>>;
  try {
    ctx = await getActiveContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  if (!hasPermission(ctx.permissions, PERMISSIONS.SETTINGS_BILLING_VIEW, ctx.isSuperAdmin)) {
    redirect('/dashboard');
  }

  const [subscription, paymentsRaw, tenant, allPlans] = await Promise.all([
    getActiveSubscription(supabase, ctx.tenantId),
    getPaymentsForTenant(supabase, ctx.tenantId),
    getTenantById(supabase, ctx.tenantId),
    getAllPlansWithFeatures(supabase),
  ]);

  // proof_url stores a private storage path — sign it so tenants can review
  // what they submitted (method !== 'bank_transfer' payments have none).
  const payments = await Promise.all(
    paymentsRaw.map(async (p) => ({
      ...p,
      signedProofUrl: await getSignedProofUrl(supabase, p.proof_url),
    }))
  );

  const plan = subscription?.plans as
    | {
        name: string;
        code: string;
        billing_type: string;
        max_guests_per_event?: number;
        max_events?: number;
        max_members?: number;
        max_free_date_changes?: number;
        price_amount?: number;
        price_currency?: string;
      }
    | null
    | undefined;

  const canSubmitProof = hasPermission(
    ctx.permissions,
    PERMISSIONS.SETTINGS_BILLING_SUBMIT_PROOF,
    ctx.isSuperAdmin
  );

  const currentPlanCode = (subscription?.plans as { code?: string } | null)?.code ?? null;
  const hasStripeCustomer = Boolean(tenant?.stripe_customer_id);

  // Show plans that match the tenant type (individual plans for individuals, org plans for orgs).
  const tenantType = tenant?.type ?? 'individual';
  const visiblePlans = allPlans.filter((p) => p.scope === tenantType || p.scope === 'individual');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan y Facturación</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu suscripción y pagos de {tenant?.name ?? 'tu workspace'}.
        </p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {plan?.name ?? 'Sin plan activo'}
              </CardTitle>
              <CardDescription>
                {subscription
                  ? `${plan?.billing_type === 'one_time' ? 'Pago único' : 'Mensual'} · ${subscription.status === 'active' ? 'Activo' : subscription.status}`
                  : 'No hay suscripción activa. Elige un plan y envía tu comprobante.'}
              </CardDescription>
            </div>
            {plan?.price_amount !== undefined && (
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {plan.price_currency} {plan.price_amount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.billing_type === 'one_time' ? 'pago único' : '/mes'}
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        {subscription && plan && (
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">Uso del plan</p>
              {plan.max_guests_per_event !== undefined && (
                <UsageBar used={0} max={plan.max_guests_per_event} label="Invitados por evento" />
              )}
              {plan.max_events !== undefined && (
                <UsageBar used={0} max={plan.max_events} label="Eventos" />
              )}
              {plan.max_members !== undefined && (
                <UsageBar used={0} max={plan.max_members} label="Miembros del equipo" />
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stripe plan selector — always show so tenants can upgrade / switch */}
      {canSubmitProof && visiblePlans.length > 0 && (
        <StripePlanSelector
          plans={visiblePlans}
          currentPlanCode={currentPlanCode}
          hasStripeCustomer={hasStripeCustomer}
        />
      )}

      {/* Manual bank-transfer proof — fallback / alternative */}
      {canSubmitProof && (
        <BillingProofForm
          tenantId={ctx.tenantId}
          planId={plan ? (subscription?.plan_id ?? '') : ''}
          subscriptionId={subscription?.id ?? null}
          billingType={(plan?.billing_type as 'one_time' | 'recurring') ?? 'one_time'}
        />
      )}

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin pagos registrados.</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {p.submitted_at
                          ? format(new Date(p.submitted_at), 'dd MMM yyyy', { locale: esLocale })
                          : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.currency} {p.amount}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.reference ?? '—'}
                      </TableCell>
                      <TableCell>
                        {p.signedProofUrl ? (
                          <a
                            href={p.signedProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Ver
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
