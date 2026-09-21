'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CalendarDays } from 'lucide-react';

import { toast } from '@/hooks';
import { setActiveEventAction, setActiveTenantAction } from '@/app/dashboard/context-actions';

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from '@/components/ui';

export interface ContextOption {
  id: string;
  name: string;
}

interface Props {
  tenants: ContextOption[];
  events: ContextOption[];
  activeTenantId: string | null;
  activeEventId: string | null;
}

/**
 * Header control for switching the active tenant (workspace) and event.
 * Each selector renders only when there is more than one option to choose from.
 */
export function ContextSwitcher({ tenants, events, activeTenantId, activeEventId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const showTenants = tenants.length > 1;
  const showEvents = events.length > 1;
  if (!showTenants && !showEvents) return null;

  const handleTenant = (id: string) => {
    if (id === activeTenantId) return;
    startTransition(async () => {
      const res = await setActiveTenantAction(id);
      if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
      else router.refresh();
    });
  };

  const handleEvent = (id: string) => {
    if (id === activeEventId) return;
    startTransition(async () => {
      const res = await setActiveEventAction(id);
      if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
      else router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      {showTenants && (
        <Select value={activeTenantId ?? undefined} onValueChange={handleTenant} disabled={isPending}>
          <SelectTrigger className="h-9 w-[150px] sm:w-[180px]" aria-label="Workspace activo">
            <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showEvents && (
        <Select value={activeEventId ?? undefined} onValueChange={handleEvent} disabled={isPending}>
          <SelectTrigger className="h-9 w-[150px] sm:w-[180px]" aria-label="Evento activo">
            <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Evento" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
