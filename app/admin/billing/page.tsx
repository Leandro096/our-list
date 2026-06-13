import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { es as esLocale } from 'date-fns/locale';

import { createClient } from '@/lib/supabase/server';
import { PLATFORM_PERMISSIONS } from '@/lib/permissions';
import { requirePlatformPermission } from '@/lib/server-auth';

import { getPendingPayments } from '@/services/billing.service';

import { AdminBillingActions } from '@/components/admin/billing-actions';
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

export const metadata = { title: 'Revisión de Pagos — Admin' };

export default async function AdminBillingPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof requirePlatformPermission>>;
  try {
    ctx = await requirePlatformPermission(supabase, PLATFORM_PERMISSIONS.BILLING_VIEW);
  } catch {
    redirect('/dashboard');
  }

  const payments = await getPendingPayments(supabase);

  const canConfirm = ctx.platformPermissions.some(
    (p) => p === PLATFORM_PERMISSIONS.BILLING_CONFIRM || p === PLATFORM_PERMISSIONS.ALL
  );
  const canReject = ctx.platformPermissions.some(
    (p) => p === PLATFORM_PERMISSIONS.BILLING_REJECT || p === PLATFORM_PERMISSIONS.ALL
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Revisión de Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Revisa y confirma los comprobantes de pago pendientes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagos pendientes</CardTitle>
          <CardDescription>
            {payments.length === 0
              ? 'No hay pagos pendientes.'
              : `${payments.length} pago${payments.length !== 1 ? 's' : ''} en espera de revisión.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No hay pagos pendientes de revisión.
            </p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead className="w-[180px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const tenant = p.tenants as { name?: string } | null;
                    const plan = p.plans as { name?: string; code?: string } | null;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{tenant?.name ?? '—'}</TableCell>
                        <TableCell>
                          {plan?.name ? <Badge variant="outline">{plan.name}</Badge> : '—'}
                        </TableCell>
                        <TableCell>
                          {p.currency} {p.amount}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.submitted_at
                            ? format(new Date(p.submitted_at), 'dd MMM yyyy', { locale: esLocale })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {p.proof_url ? (
                            <a
                              href={p.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              Ver
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin archivo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AdminBillingActions
                            paymentId={p.id}
                            canConfirm={canConfirm}
                            canReject={canReject}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
