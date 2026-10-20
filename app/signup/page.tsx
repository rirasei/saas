import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export const instant = false;

interface SignupPageProps {
  searchParams?: Promise<{ next?: string }>;
}

async function SignupRedirect({ searchParams }: SignupPageProps): Promise<null> {
  await connection();
  const params = searchParams ? await searchParams : {};
  const nextParam = params.next ? `&next=${encodeURIComponent(params.next)}` : '';
  redirect(`/auth?mode=register${nextParam}`);
  return null;
}

export default function SignupPage(props: SignupPageProps) {
  return (
    <Suspense fallback={null}>
      <SignupRedirect {...props} />
    </Suspense>
  );
}


