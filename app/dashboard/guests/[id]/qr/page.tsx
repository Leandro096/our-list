import { notFound } from "next/navigation";
import { QRCodeDisplay } from "@/components";
import { createClient } from "@/lib/supabase/server";

async function getGuest(id: string) {
  const supabase = await createClient();
  const { data: guest } = await supabase
    .from("guests")
    .select("id, invitation_guid, first_name, last_name")
    .eq("id", id)
    .single();
  return guest;
}

export default async function GuestQRPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guest = await getGuest(id);

  if (!guest) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <QRCodeDisplay guest={guest} />
    </div>
  );
}
