'use client';

import React from 'react';

export interface TagChipProps {
  tag: string;
  selected?: boolean;
  removable?: boolean;
  color?: 'primary' | 'secondary' | 'neutral';
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const TagChip: React.FC<TagChipProps> = ({
  tag,
  selected = false,
  removable = false,
  color = 'neutral',
  onClick,
  onRemove,
  className = '',
}) => {
  const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;

  const colorStyles = {
    primary: selected
      ? 'bg-primary text-on-primary shadow-xs'
      : 'bg-primary/10 text-primary hover:bg-primary/20',
    secondary: selected
      ? 'bg-secondary text-on-secondary shadow-xs'
      : 'bg-secondary/15 text-secondary hover:bg-secondary/25',
    neutral: selected
      ? 'bg-primary text-on-primary shadow-xs'
      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-label-sm text-xs font-medium transition-all ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      } ${colorStyles[color]} ${className}`}
    >
      <span>{formattedTag}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 p-0.5 rounded-full inline-flex items-center justify-center transition-opacity"
          aria-label="태그 삭제"
        >
          <span className="material-symbols-outlined text-xs">close</span>
        </button>
      )}
    </span>
  );
};
