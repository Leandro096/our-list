import type { Metadata } from 'next';

import AuthErrorClient from './error-client';

export const metadata: Metadata = {
  title: 'Error de autenticación — Wedding List',
  description: 'Se produjo un error durante el proceso de autenticación.',
};

export default function AuthErrorPage() {
  return <AuthErrorClient />;
}
