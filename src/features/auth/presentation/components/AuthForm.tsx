'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { createClient } from '@/src/shared/lib/supabase/client';
import {
  loginWithEmail,
  signupWithEmail,
  AuthActionResult,
} from '../actions/auth.server-actions';

interface AuthFormProps {
  initialMode?: 'login' | 'register';
  callbackError?: string | null;
  next?: string;
}

export function AuthForm({ initialMode = 'login', callbackError, next }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [actionResult, setActionResult] = useState<AuthActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);

  const supabase = createClient();

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setOauthLoading(provider);
      setActionResult(null);
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setActionResult({ success: false, error: error.message });
        setOauthLoading(null);
        return;
      }

      if (data?.url) {
        try {
          const res = await fetch(data.url, { method: 'GET', redirect: 'manual' });
          if (res.status === 400) {
            const errJson = await res.json().catch(() => null);
            if (
              errJson?.msg?.includes('not enabled') ||
              errJson?.error_code === 'validation_failed'
            ) {
              setActionResult({
                success: false,
                error: `Supabase 대시보드에서 ${
                  provider === 'google' ? 'Google' : 'GitHub'
                } 소셜 로그인이 아직 활성화되지 않았습니다. 현재는 이메일/비밀번호 로그인을 이용해 주시거나, Supabase 콘솔(Authentication > Providers)에서 Client ID/Secret을 등록해 주세요.`,
              });
              setOauthLoading(null);
              return;
            }
          }
        } catch {
          // fetch network/CORS fallback
        }

        window.location.assign(data.url);
      }
    } catch {
      setActionResult({ success: false, error: '소셜 로그인 도중 오류가 발생했습니다.' });
      setOauthLoading(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionResult(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      if (mode === 'login') {
        const res = await loginWithEmail(null, formData);
        if (res) setActionResult(res);
      } else {
        const res = await signupWithEmail(null, formData);
        if (res) setActionResult(res);
      }
    });
  };

  let displayError = actionResult?.error || callbackError;
  if (
    displayError &&
    (displayError.includes('Unsupported provider') ||
      displayError.includes('provider is not enabled') ||
      displayError.includes('validation_failed'))
  ) {
    displayError =
      'Supabase 대시보드에서 해당 소셜 로그인(Google/GitHub) 제공자가 아직 활성화되지 않았습니다. 아래 이메일 로그인을 이용하시거나 Supabase 콘솔(Authentication > Providers)에서 OAuth 설정을 활성화해 주세요.';
  }

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Subtle ambient decorative glow background */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl border border-outline-variant/20">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* ========================================================= */}
          {/* Left Column: Branding Showcase & Visual Storytelling */}
          {/* ========================================================= */}
          <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-8 xl:p-10 bg-surface-container-low text-on-surface overflow-hidden">
            {/* Ambient decorative shapes */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary-fixed opacity-40 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full bg-secondary-fixed opacity-30 blur-2xl pointer-events-none" />

            {/* Top Header & Brand Identity */}
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-md">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    note_alt
                  </span>
                </div>
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
                  CloudNote
                </span>
              </div>

              <div className="mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  v2.4 워크스페이스 출시
                </span>
                <h2 className="mt-3 font-headline-md text-headline-md text-on-surface tracking-tight leading-snug">
                  생각을 엮고,
                  <br />
                  아이디어를 현실로.
                </h2>
                <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  지식 근로자와 제품 빌더를 위한 초고속 협업 워크스페이스. 실시간 AI 요약과 구조화된 지식 캔버스를 경험하세요.
                </p>
              </div>
            </div>

              {/* Center Visual Card: Preview of CloudNote in action */}
              <div className="relative z-10 my-6">
                <div className="relative rounded-2xl overflow-hidden shadow-lg bg-surface-container border border-outline-variant/30">
                  <div className="relative w-full h-44">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJZrB_ffStH_7xhWmu3gCLP38yyc6Jn7rxF9HLChfPikUtdOdEbf-OeYHSzvGxnO_xOPGffe-MALqnpX21x6LyvOtndQ0EngRcMF_T7MfCy6SvSsIhvDk_XvF6rBfDdLle3Z_JIq3FL0yYHql-o_O8iFyfxOGLVKalgrCbX8jORnqdLYwKOWJCMOqlLuCxcCERpuSHhmz22qu97qpzlyzwaiMAK1pldnkqD6_xurd6SM_6IQbIP7EpEg"
                      alt="CloudNote collaborative workspace preview"
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 400px"
                    />
                  </div>
                <div className="p-4 bg-surface-container-lowest">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-secondary text-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        auto_awesome
                      </span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        실시간 스마트 요약기능 탑재
                      </span>
                    </div>
                    <span className="font-code text-code text-outline text-xs px-1.5 py-0.5 rounded bg-surface-container-low font-bold">
                      ⌘K
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                    &quot;클라우드노트로 전환한 뒤 스프린트 문서화 속도가 3배 향상되었습니다.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Trust Indicators */}
            <div className="relative z-10 pt-2">
              <div className="flex items-center gap-6">
                <div>
                  <p className="font-headline-sm text-headline-sm text-primary font-bold">
                    120,000+
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    활성 팀 워크스페이스
                  </p>
                </div>
                <div className="w-px h-8 bg-surface-container-high" />
                <div>
                  <p className="font-headline-sm text-headline-sm text-secondary font-bold">
                    99.99%
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    글로벌 무중단 가동률
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* Right Column: Interactive Auth Form (Login & Register) */}
          {/* ========================================================= */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-surface-container-lowest">
            <div>
              {/* Mobile Brand Indicator */}
              <div className="flex lg:hidden items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      note_alt
                    </span>
                  </div>
                  <span className="font-title text-title text-on-surface font-bold">CloudNote</span>
                </div>
                <span className="font-label-sm text-label-sm text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full font-semibold">
                  Pro Workspace
                </span>
              </div>

              {/* Auth Mode Segmented Controller (Tab System) */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex p-1 rounded-xl bg-surface-container">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setActionResult(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all duration-150 font-semibold ${
                      mode === 'login'
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    로그인
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setActionResult(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all duration-150 font-semibold ${
                      mode === 'register'
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    회원가입
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  256-bit TLS 종단간 암호화
                </div>
              </div>

              {/* Header Titles */}
              <div className="mb-6">
                <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                  {mode === 'login' ? '다시 오신 것을 환영합니다' : '새로운 워크스페이스 시작하기'}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {mode === 'login'
                    ? '클라우드노트 계정으로 로그인하여 지식을 이어나가세요.'
                    : '신용카드 없이 14일 무료 체험을 시작할 수 있습니다.'}
                </p>
              </div>

              {/* Error & Feedback Alerts */}
              {displayError && (
                <div className="mb-4 p-3.5 rounded-xl bg-error-container/60 text-error font-body-sm text-body-sm flex items-start gap-2.5 border border-error/20">
                  <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
                  <span className="leading-relaxed">{displayError}</span>
                </div>
              )}

              {actionResult?.needsEmailConfirmation && (
                <div className="mb-4 p-4 rounded-xl bg-secondary-container/40 text-secondary font-body-sm text-body-sm flex items-start gap-2.5 border border-secondary/20">
                  <span className="material-symbols-outlined text-xl mt-0.5">mark_email_read</span>
                  <div>
                    <p className="font-semibold text-on-surface">회원가입 확인 메일이 발송되었습니다.</p>
                    <p className="mt-0.5 text-on-surface-variant">
                      입력하신 이메일의 확인 링크를 클릭하여 계정을 활성화해 주세요.
                    </p>
                  </div>
                </div>
              )}

              {/* Social Authentication Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  disabled={oauthLoading !== null || isPending}
                  onClick={() => handleOAuthLogin('google')}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all duration-150 active:scale-[0.99] border border-outline-variant/30 disabled:opacity-50"
                >
                  {oauthLoading === 'google' ? (
                    <span className="material-symbols-outlined animate-spin text-lg">
                      progress_activity
                    </span>
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  <span>Google로 계속하기</span>
                </button>

                <button
                  type="button"
                  disabled={oauthLoading !== null || isPending}
                  onClick={() => handleOAuthLogin('github')}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all duration-150 active:scale-[0.99] border border-outline-variant/30 disabled:opacity-50"
                >
                  {oauthLoading === 'github' ? (
                    <span className="material-symbols-outlined animate-spin text-lg">
                      progress_activity
                    </span>
                  ) : (
                    <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                  )}
                  <span>GitHub으로 계속하기</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-5">
                <div className="w-full h-px bg-surface-container-high" />
                <span className="absolute px-3 bg-surface-container-lowest font-label-sm text-label-sm text-outline">
                  또는 이메일로 계속하기
                </span>
              </div>

              {/* Form Element */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="next" value={next || ''} />
                {/* Full Name field (Register only) */}
                {mode === 'register' && (
                  <div className="flex flex-col gap-1.5 transition-all">
                    <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="name">
                      이름
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-xl pointer-events-none">
                        badge
                      </span>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="홍길동"
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all border border-transparent focus:border-primary/40 shadow-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address field */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="email">
                    이메일 주소
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-xl pointer-events-none">
                      mail
                    </span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="name@company.com"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all border border-transparent focus:border-primary/40 shadow-xs"
                    />
                  </div>
                </div>

                {/* Password field with Visibility Toggle */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="password">
                      비밀번호
                    </label>
                    {mode === 'login' && (
                      <a
                        href="#forgot"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('비밀번호 재설정 링크를 받으려면 고객센터로 문의하거나 가입한 이메일을 확인해 주세요.');
                        }}
                        className="font-label-sm text-label-sm text-primary hover:underline"
                      >
                        비밀번호를 잊으셨나요?
                      </a>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-xl pointer-events-none">
                      lock
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="8자 이상 영문, 숫자 조합"
                      className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all border border-transparent focus:border-primary/40 font-code shadow-xs"
                    />
                    <button
                      type="button"
                      aria-label="비밀번호 보기 토글"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-outline hover:text-on-surface transition-colors flex items-center justify-center p-1"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Checkbox Row: Remember Me (Login) OR Terms Agreement (Register) */}
                {mode === 'login' ? (
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        id="remember_me"
                        name="remember_me"
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        30일간 로그인 상태 유지
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        id="agree_terms"
                        name="agree_terms"
                        type="checkbox"
                        defaultChecked
                        required
                        className="mt-1 w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                        <span className="text-primary hover:underline font-label-sm">
                          서비스 이용약관
                        </span>
                        {' 및 '}
                        <span className="text-primary hover:underline font-label-sm">
                          개인정보 처리방침
                        </span>
                        에 동의합니다.
                      </span>
                    </label>
                  </div>
                )}

                {/* Primary Submit Action */}
                <button
                  type="submit"
                  disabled={isPending || oauthLoading !== null}
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">
                        progress_activity
                      </span>
                      <span>처리 중...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? '이메일로 로그인' : '계정 생성하고 시작하기'}</span>
                      <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Bottom Link Indicator */}
              <div className="mt-5 text-center">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {mode === 'login' ? (
                    <>
                      아직 회원이 아니신가요?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setActionResult(null);
                        }}
                        className="font-label-md text-label-md text-primary font-semibold hover:underline ml-1 cursor-pointer"
                      >
                        무료 회원가입
                      </button>
                    </>
                  ) : (
                    <>
                      이미 계정이 있으신가요?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setActionResult(null);
                        }}
                        className="font-label-md text-label-md text-primary font-semibold hover:underline ml-1 cursor-pointer"
                      >
                        로그인
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Footer Trust & Compliance Meta */}
            <div className="mt-8 pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-secondary">verified_user</span>
                <span className="font-label-sm text-label-sm font-medium">
                  SOC-2 Type II &amp; ISO 27001 공인 보안
                </span>
              </div>
              <div className="flex items-center gap-3 font-label-sm text-label-sm text-outline">
                <span className="hover:text-on-surface transition-colors cursor-pointer">
                  보안 백서
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-outline-variant" />
                <span className="hover:text-on-surface transition-colors cursor-pointer">
                  개인정보 보호
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-outline-variant" />
                <span className="hover:text-on-surface transition-colors cursor-pointer">
                  고객 지원
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
