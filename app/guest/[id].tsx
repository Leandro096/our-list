"use client";

import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { getGuestById } from "@/services";
import { GuestConfirmation } from "@/components";

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
