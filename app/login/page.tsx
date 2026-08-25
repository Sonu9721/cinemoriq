import type { Metadata } from 'next';
import { LoginScreen } from '../../components/auth/login-screen';
import { safeAuthReturnPath } from '../../lib/auth-paths';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Secure sign in — Cinemoriq',
  description: 'Secure administrator access to the Cinemoriq creative operating system.',
  robots: {
    index: false,
    follow: false,
  },
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedPath = Array.isArray(params.next) ? params.next[0] : params.next;

  return <LoginScreen nextPath={safeAuthReturnPath(requestedPath)} />;
}
