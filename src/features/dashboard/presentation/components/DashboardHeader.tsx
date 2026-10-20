'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface DashboardHeaderProps {
  user: {
    name: string;
    avatarUrl?: string;
  };
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user }) => {
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-8 border-b border-outline-variant/15">
      {/* Search Input Box */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-surface-container-high/60 text-on-surface-variant border border-outline-variant/20 focus-within:border-primary/50 focus-within:bg-surface-container-lowest transition-all">
          <span className="material-symbols-outlined text-lg text-outline">search</span>
          <input
            className="bg-transparent w-full text-on-surface font-body-sm text-body-sm focus:outline-none placeholder:text-outline"
            placeholder="노트, 태그, 콘텐츠 검색 (⌘K)"
            type="text"
          />
        </div>
      </div>

      {/* Right Action Icons & Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/notes/new"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-xs active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>새 노트</span>
        </Link>

        <button
          className="p-2 text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
          type="button"
          aria-label="알림"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>

        <div className="flex items-center gap-2 pl-2">
          {user.avatarUrl ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary-fixed bg-surface-container">
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
              className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs ring-2 ring-primary-fixed shadow-xs"
              title={user.name}
            >
              {user.name ? user.name.slice(0, 1) : 'U'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
