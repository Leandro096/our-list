import type { Metadata } from 'next';

import ForgotPasswordClient from './forgot-password-client';

export const metadata: Metadata = {
  title: 'Restablecer contraseña — Wedding List',
  description: 'Solicita un enlace para restablecer tu contraseña.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
