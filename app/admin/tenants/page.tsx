import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';

import { createClient } from '@/lib/supabase/server';
import { getPlatformContext } from '@/lib/server-auth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '@/lib/permissions';

import { getPlans } from '@/services/plan.service';
import { getAllTenantsWithPlan } from '@/services/platform.service';

import { TenantActions } from '@/components/admin/tenant-actions';
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

export const metadata = { title: 'Tenants — Admin' };

function TenantTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{type === 'individual' ? 'Individual' : 'Organización'}</Badge>;
}

function TenantStatusBadge({ status }: { status: string }) {
  if (status === 'active')
    return <Badge className="border-green-200 bg-green-100 text-green-700">Activo</Badge>;
  if (status === 'suspended') return <Badge variant="secondary">Suspendido</Badge>;
  return <Badge variant="destructive">Cancelado</Badge>;
}

export default async function AdminTenantsPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getPlatformContext>>;
  try {
    ctx = await getPlatformContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  if (!hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.TENANTS_VIEW)) {
    redirect('/dashboard');
  }

  const canManage = hasPlatformPermission(
    ctx.platformPermissions,
    PLATFORM_PERMISSIONS.TENANTS_MANAGE
  );

  const [tenants, plans] = await Promise.all([getAllTenantsWithPlan(supabase), getPlans(supabase)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Todos los workspaces registrados en la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>
            {tenants.length} workspace{tenants.length !== 1 ? 's' : ''} registrado
            {tenants.length !== 1 ? 's' : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No se encontraron tenants.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plan activo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Subdominio</TableHead>
                    <TableHead>Creado</TableHead>
                    {canManage && <TableHead className="w-[220px]">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <TenantTypeBadge type={t.type} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.plan_name ? (
                          <Badge variant="outline">{t.plan_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TenantStatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.subdomain ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(t.created_at), {
                          addSuffix: true,
                          locale: esLocale,
                        })}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <TenantActions
                            tenantId={t.id}
                            tenantName={t.name}
                            status={t.status}
                            currentPlanCode={t.plan_code}
                            plans={plans}
                            canManage={canManage}
                          />
                        </TableCell>
                      )}
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
