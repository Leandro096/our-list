import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';

import { createClient } from '@/lib/supabase/server';
import { PLATFORM_PERMISSIONS } from '@/lib/permissions';
import { requirePlatformPermission } from '@/lib/server-auth';

import { getAllTenants } from '@/services/tenant.service';

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
    return <Badge className="bg-green-100 text-green-700 border-green-200">Activo</Badge>;
  if (status === 'suspended') return <Badge variant="secondary">Suspendido</Badge>;
  return <Badge variant="destructive">Cancelado</Badge>;
}

export default async function AdminTenantsPage() {
  const supabase = await createClient();

  try {
    await requirePlatformPermission(supabase, PLATFORM_PERMISSIONS.TENANTS_VIEW);
  } catch {
    redirect('/dashboard');
  }

  const tenants = await getAllTenants(supabase);

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
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Subdominio</TableHead>
                    <TableHead>Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <TenantTypeBadge type={t.type} />
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
