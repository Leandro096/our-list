import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auth — Wedding List',
  description: 'Sign in, sign up, or manage your wedding guest list account.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
