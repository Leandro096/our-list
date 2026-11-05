import { redirect } from 'next/navigation';

// Creating a guest now happens in a dialog on the guests page.
export default function NewGuestPage() {
  redirect('/dashboard/guests?guest=new');
}
