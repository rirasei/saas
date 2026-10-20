import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const nextParam = params.next ? `?next=${encodeURIComponent(params.next)}` : '';
  redirect(`/auth${nextParam}`);
}

