import { redirect } from 'next/navigation';

export default async function EditGuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/guests?guest=${id}&tab=edit`);
}
