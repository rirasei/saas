import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export const instant = false;

interface LoginPageProps {
  searchParams?: Promise<{ next?: string }>;
}

async function LoginRedirect({ searchParams }: LoginPageProps): Promise<null> {
  await connection();
  const params = searchParams ? await searchParams : {};
  const nextParam = params.next ? `?next=${encodeURIComponent(params.next)}` : '';
  redirect(`/auth${nextParam}`);
  return null;
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <Suspense fallback={null}>
      <LoginRedirect {...props} />
    </Suspense>
  );
}


