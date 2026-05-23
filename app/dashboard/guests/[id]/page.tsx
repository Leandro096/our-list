import { getGuestById } from "@/services";
import { GuestDetail } from "@/components";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function GuestDetailPage({
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

  return <GuestDetail guest={guest} />;
}
