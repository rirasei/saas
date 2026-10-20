'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/src/shared/lib/supabase/client';

const NavbarContent: React.FC = () => {
  const pathname = usePathname();
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        let name =
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0];
        let avatarUrl = authUser.user_metadata?.avatar_url;

        try {
          const { data: profile } = (await supabase
            .from('user')
            .select('name, email, avatar_url')
            .eq('id', authUser.id)
            .maybeSingle()) as unknown as {
            data: { name?: string | null; email?: string | null; avatar_url?: string | null } | null;
          };

          if (profile?.name) name = profile.name;
          if (profile?.avatar_url) avatarUrl = profile.avatar_url;
        } catch {
          // ignore
        }

        setUser({
          name: name || '사용자',
          email: authUser.email || 'user@cloudnote.io',
          avatarUrl: avatarUrl || undefined,
        });
      } else {
        setUser(null);
      }
    };

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isHomeActive = pathname === '/';
  const isDashboardActive = pathname?.startsWith('/dashboard');
  const isNotesActive = pathname?.startsWith('/notes');
  const isPricingActive = pathname?.startsWith('/pricing') || pathname?.startsWith('/subscription');

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/15">
      <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        {/* Brand & Main Navigation Links */}
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-3 group" href="/">
            <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              C
            </span>
            <span className="font-title text-title text-on-surface tracking-tight font-semibold">
              CloudNote
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`font-label-md text-label-md transition-colors ${
                isHomeActive
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              홈
            </Link>
            <Link
              href="/dashboard"
              className={`font-label-md text-label-md transition-colors ${
                isDashboardActive
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              대시보드
            </Link>
            <Link
              href="/notes/new"
              className={`font-label-md text-label-md transition-colors ${
                isNotesActive
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              새 노트 작성
            </Link>
            <Link
              href="/pricing"
              className={`font-label-md text-label-md transition-colors ${
                isPricingActive
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              요금제
            </Link>
          </nav>
        </div>

        {/* Right CTA Actions & Profile */}
        <div className="flex items-center gap-4">
          <Link
            href="/notes/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-[0_1px_4px_rgba(0,74,198,0.2)] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>새 노트</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              className="p-2 text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
              type="button"
              aria-label="알림"
              onClick={() => alert('새로운 알림이 없습니다.')}
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>

            {user ? (
              <Link
                href="/dashboard"
                className="inline-block ring-2 ring-primary-fixed rounded-full hover:ring-primary transition-all"
                title={`${user.name || '사용자'}의 대시보드`}
              >
                {user.avatarUrl ? (
                  <img
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    src={user.avatarUrl}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name.slice(0, 1) : 'U'}
                  </div>
                )}
              </Link>
            ) : (
              <Link
                href="/auth?mode=login"
                className="px-4 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export const Navbar: React.FC = () => {
  return (
    <Suspense
      fallback={
        <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/15 h-16">
          <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
            <Link className="flex items-center gap-3" href="/">
              <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
                C
              </span>
              <span className="font-title text-title text-on-surface tracking-tight font-semibold">
                CloudNote
              </span>
            </Link>
          </div>
        </header>
      }
    >
      <NavbarContent />
    </Suspense>
  );
};
