'use client';

import React from 'react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  shortcutBadge?: string;
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = '노트, 태그, 콘텐츠 검색 (⌘K)',
  shortcutBadge = '⌘K',
  value,
  onChange,
  onClear,
  containerClassName = '',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-high/60 text-on-surface-variant border border-outline-variant/20 focus-within:border-primary/50 focus-within:bg-surface-container-lowest focus-within:shadow-xs transition-all ${containerClassName}`}
    >
      <span className="material-symbols-outlined text-lg text-outline shrink-0">search</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`bg-transparent w-full text-on-surface font-body-sm text-body-sm focus:outline-none placeholder:text-outline ${className}`}
        {...props}
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="검색어 지우기"
          className="text-outline hover:text-on-surface p-0.5 rounded-full"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      ) : (
        shortcutBadge && (
          <kbd className="hidden sm:inline-block font-code px-1.5 py-0.5 rounded bg-surface-container-lowest text-outline-variant shadow-xs text-xs font-semibold select-none shrink-0 border border-outline-variant/15">
            {shortcutBadge}
          </kbd>
        )
      )}
    </div>
  );
};
