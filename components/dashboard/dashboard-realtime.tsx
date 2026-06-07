'use client';

import dynamic from 'next/dynamic';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { createClient } from '@/lib/supabase/client';

import { toast } from '@/hooks';
import type { DashboardStats } from '@/lib';
import { getDashboardStats } from '@/services';

import { Spinner } from '@/components/ui/spinner';

const DashboardContent = dynamic(
  () => import('./dashboard-content').then((m) => m.DashboardContent),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    ),
  }
);

interface DashboardRealtimeProps {
  initialStats: DashboardStats;
}

export function DashboardRealtime({ initialStats }: DashboardRealtimeProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const fresh = await getDashboardStats(supabase);
      setStats(fresh);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar las estadísticas del dashboard.',
        variant: 'destructive',
      });
    }
  }, [supabase]);

  // Stable ref so subscribe doesn't need refetch as a dep (avoids re-subscription)
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () =>
        refetchRef.current()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scan_logs' }, () =>
        refetchRef.current()
      )
      .subscribe();

    channelRef.current = channel;
  }, [supabase]);

  useEffect(() => {
    subscribe();

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refetchRef.current();
        subscribe();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [subscribe, supabase]);

  return <DashboardContent stats={stats} />;
}
