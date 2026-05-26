"use client";

import type { DashboardStats } from "@/lib";
import { getDashboardStats } from "@/services";
import { createClient } from "@/lib/supabase/client";
import { DashboardContent } from "./dashboard-content";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks";

interface DashboardRealtimeProps {
  initialStats: DashboardStats;
}

export function DashboardRealtime({ initialStats }: DashboardRealtimeProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const fresh = await getDashboardStats(supabase);
      setStats(fresh);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las estadísticas del dashboard.",
        variant: "destructive",
      });
    }
  }, [supabase]);

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "scan_logs" }, refetch)
      .subscribe();

    channelRef.current = channel;
  }, [supabase, refetch]);

  useEffect(() => {
    subscribe();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refetch();
        subscribe();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [subscribe, refetch, supabase]);

  return <DashboardContent stats={stats} />;
}
