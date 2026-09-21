'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';

import { toast } from '@/hooks';
import { useTranslation } from '@/locales';
import { createFirstEventAction } from '@/app/dashboard/context-actions';

import {
  Card,
  Button,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from '@/components/ui';

/**
 * Shown on the dashboard instead of a crash when the active tenant has no
 * event yet — lets the user create one in a single click rather than hitting
 * a dead-end error page.
 */
export function CreateFirstEvent() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const result = await createFirstEventAction();
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      router.refresh();
    } catch {
      toast({
        title: t('errors.server.title'),
        description: t('errors.server.description'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md text-center">
      <CardHeader>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <CalendarPlus className="h-7 w-7 text-primary" />
        </div>
        <CardTitle>Crea tu primer evento</CardTitle>
        <CardDescription>
          Tu workspace todavía no tiene un evento activo. Crea uno para empezar a gestionar
          invitados, mesas y más.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleCreate} disabled={isLoading} className="w-full">
          {isLoading ? 'Creando…' : 'Crear evento'}
        </Button>
      </CardContent>
    </Card>
  );
}
