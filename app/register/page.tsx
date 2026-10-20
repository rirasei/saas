import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export const instant = false;

interface RegisterPageProps {
  searchParams?: Promise<{ next?: string }>;
}

async function RegisterRedirect({ searchParams }: RegisterPageProps): Promise<null> {
  await connection();
  const params = searchParams ? await searchParams : {};
  const nextParam = params.next ? `&next=${encodeURIComponent(params.next)}` : '';
  redirect(`/auth?mode=register${nextParam}`);
  return null;
}

export default function RegisterPage(props: RegisterPageProps) {
  return (
    <Suspense fallback={null}>
      <RegisterRedirect {...props} />
    </Suspense>
  );
}


