import type { Metadata } from 'next';

import SignUpSuccessClient from './sign-up-success-client';

export const metadata: Metadata = {
  title: 'Revisa tu correo — Wedding List',
  description:
    'Te hemos enviado un correo de confirmación. Por favor revisa tu bandeja de entrada.',
};

export default function SignUpSuccessPage() {
  return <SignUpSuccessClient />;
}
