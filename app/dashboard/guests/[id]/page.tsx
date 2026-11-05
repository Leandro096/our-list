import { redirect } from 'next/navigation';

// A guest now opens in a dialog on the guests page.
export default async function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/guests?guest=${id}`);
}
