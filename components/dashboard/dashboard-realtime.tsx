"use client";

import type { DashboardStats } from "@/lib";
import { getDashboardStats } from "@/services";
import { createClient } from "@/lib/supabase/client";
import { DashboardContent } from "./dashboard-content";
import { useState, useEffect, useCallback } from "react";

interface DashboardRealtimeProps {
  initialStats: DashboardStats;
}

export function DashboardRealtime({ initialStats }: DashboardRealtimeProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const supabase = createClient();

  const refetch = useCallback(async () => {
    try {
      const fresh = await getDashboardStats(supabase);
      setStats(fresh);
    } catch (err) {
      console.error("Error refreshing dashboard stats:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guests" },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scan_logs" },
        refetch,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  return <DashboardContent stats={stats} />;
}
