import type { Metadata } from 'next';

import SignUpClient from './sign-up-client';

export const metadata: Metadata = {
  title: 'Crear cuenta — Wedding List',
  description: 'Crea tu cuenta para empezar a gestionar tu lista de bodas.',
};

export default function SignUpPage() {
  return <SignUpClient />;
}
