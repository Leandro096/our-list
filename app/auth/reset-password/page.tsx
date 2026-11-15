import type { Metadata } from 'next';

import ResetPasswordClient from './reset-password-client';

export const metadata: Metadata = {
  title: 'Nueva contraseña — Wedding List',
  description: 'Elige una nueva contraseña para tu cuenta.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
