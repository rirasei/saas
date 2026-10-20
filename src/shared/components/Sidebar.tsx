'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/src/features/auth/presentation/actions/auth.server-actions';

export interface SidebarProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const pathname = usePathname();

  const navItems = [
    { label: '대시보드', href: '/dashboard', icon: 'dashboard', active: pathname === '/dashboard' },
    { label: '노트 관리', href: '/notes', icon: 'article', active: pathname === '/notes' },
    { label: '노트 작성', href: '/notes/new', icon: 'edit_document', active: pathname === '/notes/new' },
    { label: '서비스 소개', href: '/', icon: 'public', active: pathname === '/' },
    { label: '요금제 및 구독', href: '/pricing', icon: 'loyalty', active: pathname.startsWith('/pricing') || pathname.startsWith('/subscription') },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-surface-container-low z-40 flex flex-col pt-4 pb-6 shadow-[1px_0_8px_rgba(0,0,0,0.03)] border-r border-outline-variant/20">
      {/* Brand Header */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm">
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            note_alt
          </span>
        </div>
        <span className="font-title text-title text-on-surface font-semibold tracking-tight">
          CloudNote
        </span>
      </div>

      {/* Primary Action Button */}
      <div className="px-4 mb-6">
        <Link
          href="/notes/new"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-[0_2px_8px_rgba(0,74,198,0.25)] active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          <span>+ 새 노트 작성</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-label-md text-label-md ${
              item.active
                ? 'bg-surface-container-high text-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom User Profile Section */}
      <div className="px-4 pt-4 border-t border-outline-variant/30 flex items-center gap-3">
        {user.avatarUrl ? (
          <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-outline-variant shrink-0 bg-surface-container">
            <Image
              src={user.avatarUrl}
              alt={user.name}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-outline-variant"
            title={user.name}
          >
            {user.name ? user.name.slice(0, 1) : 'U'}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
            {user.name}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
            {user.email}
          </span>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            title="로그아웃"
            aria-label="로그아웃"
            className="text-on-surface-variant hover:text-error p-1.5 rounded-lg hover:bg-error-container/30 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
};
