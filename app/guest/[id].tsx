"use client";

import { getGuestById } from "@/services";
import { notFound } from "next/navigation";
import { GuestConfirmation } from "@/components";
import { createClient } from "@/lib/supabase/server";

export default async function GuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const guest = await getGuestById(supabase, id);

  if (!guest) {
    notFound();
  }

  return <GuestConfirmation guest={guest} />;
}
