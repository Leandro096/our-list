import type { Metadata } from 'next';

import LoginClient from './login-client';

export const metadata: Metadata = {
  title: 'Iniciar sesión — Wedding List',
  description: 'Accede a tu cuenta para gestionar tu lista de bodas.',
};

export default function LoginPage() {
  return <LoginClient />;
}
