'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/src/shared/lib/supabase/server';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export async function loginWithEmail(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: '이메일과 비밀번호를 모두 입력해 주세요.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    let errorMessage = error.message;
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = '이메일 인증이 완료되지 않았습니다. 이메일 수신함을 확인해 주세요.';
    }
    return { success: false, error: errorMessage };
  }

  const nextParam = formData.get('next') as string;
  const targetUrl =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/dashboard';

  redirect(targetUrl);
}

export async function signupWithEmail(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const agreeTerms = formData.get('agree_terms');

  if (!agreeTerms) {
    return { success: false, error: '서비스 이용약관 및 개인정보 처리방침에 동의해 주세요.' };
  }

  if (!email || !password) {
    return { success: false, error: '이메일과 비밀번호를 모두 입력해 주세요.' };
  }

  if (password.length < 8) {
    return { success: false, error: '비밀번호는 8자 이상이어야 합니다.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        name: name,
      },
    },
  });

  if (error) {
    let errorMessage = error.message;
    if (error.message.includes('User already registered')) {
      errorMessage = '이미 가입된 이메일 주소입니다. 로그인해 주세요.';
    }
    return { success: false, error: errorMessage };
  }

  // 이메일 확인이 비활성화되어 바로 세션이 발급된 경우 지정된 경로로 이동
  if (data.session) {
    const nextParam = formData.get('next') as string;
    const targetUrl =
      nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
        ? nextParam
        : '/dashboard';
    redirect(targetUrl);
  }

  return {
    success: true,
    needsEmailConfirmation: true,
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth');
}
