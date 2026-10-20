import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/src/shared/lib/supabase/server';
import { AuthForm } from '@/src/features/auth/presentation/components/AuthForm';

import { connection } from 'next/server';

export const metadata = {
  title: '로그인 및 회원가입 - CloudNote',
  description: '클라우드노트 계정으로 로그인하여 지식을 이어나가세요.',
};

interface AuthPageProps {
  searchParams: Promise<{
    mode?: 'login' | 'register';
    error?: string;
    next?: string;
  }>;
}

async function AuthContent({ searchParams }: AuthPageProps) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const safeNext =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/dashboard';

  if (user) {
    redirect(safeNext);
  }

  return (
    <AuthForm
      initialMode={params.mode === 'register' ? 'register' : 'login'}
      callbackError={params.error}
      next={params.next}
    />
  );
}

export default function AuthPage(props: AuthPageProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-surface flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthContent {...props} />
    </Suspense>
  );
}
