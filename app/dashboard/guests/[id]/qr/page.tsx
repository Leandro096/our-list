import { redirect } from 'next/navigation';

export default async function GuestQRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/guests?guest=${id}&tab=qr`);
}
