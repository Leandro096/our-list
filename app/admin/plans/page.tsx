import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { getPlatformContext } from '@/lib/server-auth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '@/lib/permissions';

import { getAllPlansWithFeatures } from '@/services/plan.service';

import { PlanRowActions } from '@/components/admin/plan-row-actions';
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

export const metadata = { title: 'Planes — Admin' };

export default async function AdminPlansPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getPlatformContext>>;
  try {
    ctx = await getPlatformContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  if (!hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.PLANS_MANAGE)) {
    redirect('/admin');
  }

  const plans = await getAllPlansWithFeatures(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Planes</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de planes disponibles. Activa/desactiva y asigna Stripe Price IDs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de planes</CardTitle>
          <CardDescription>{plans.length} planes registrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Límites</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead className="w-[200px]">Activo / Stripe Price ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {plan.scope === 'individual' ? 'Individual' : 'Organización'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {plan.price_currency} {plan.price_amount}
                      <span className="ml-1 text-muted-foreground">
                        {plan.billing_type === 'one_time' ? 'único' : '/mes'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="space-y-0.5">
                        <p>{plan.max_events === 999999 ? '∞' : plan.max_events} eventos</p>
                        <p>{plan.max_guests_per_event} inv/evento</p>
                        <p>{plan.max_members} miembros</p>
                        <p>{plan.max_free_date_changes} cambios fecha</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(plan.features ?? []).map((f) => (
                          <Badge key={f.id} variant="secondary" className="text-xs">
                            {f.key}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlanRowActions
                        planId={plan.id}
                        isActive={plan.is_active}
                        stripePriceId={plan.stripe_price_id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
