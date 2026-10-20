'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const FooterContent: React.FC = () => {
  const pathname = usePathname();

  // Hide footer on private workspace pages and auth pages
  if (
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/notes') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup')
  ) {
    return null;
  }

  return (
    <footer className="w-full bg-surface-container-low py-12 border-t border-outline-variant/15 mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-md bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
            C
          </span>
          <span className="font-title text-title text-on-surface-variant font-medium">
            CloudNote
          </span>
        </Link>

        <div className="flex items-center gap-6 font-body-sm text-body-sm text-on-surface-variant">
          <Link href="/pricing" className="hover:text-on-surface transition-colors">
            이용약관
          </Link>
          <Link href="/pricing" className="hover:text-on-surface transition-colors">
            개인정보처리방침
          </Link>
          <Link href="/pricing" className="hover:text-on-surface transition-colors">
            고객지원
          </Link>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          © 2026 CloudNote Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export const Footer: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <FooterContent />
    </Suspense>
  );
};
