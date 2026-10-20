'use client';

import React from 'react';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  className = '',
}) => {
  const initial = name ? name.trim().slice(0, 1) : 'U';

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ring-2 ring-surface shrink-0 font-bold select-none ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-primary-fixed text-primary flex items-center justify-center font-bold">
          {initial}
        </div>
      )}
    </div>
  );
};

export interface AvatarGroupProps {
  users: Array<{ name: string; avatarUrl?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 3,
  size = 'xs',
  className = '',
}) => {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className={`inline-flex items-center -space-x-1.5 overflow-hidden ${className}`}>
      {visibleUsers.map((user, idx) => (
        <Avatar
          key={`${user.name}-${idx}`}
          name={user.name}
          src={user.avatarUrl}
          size={size}
          className="ring-2 ring-surface-container-lowest"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={`inline-flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant font-label-sm font-semibold ring-2 ring-surface-container-lowest ${
            size === 'xs' ? 'w-6 h-6 text-[10px]' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-xs'
          }`}
          title={`+${remainingCount}명 더`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
