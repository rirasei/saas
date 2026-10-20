'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  pulse?: boolean;
  pulseColor?: string;
  icon?: string;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  primary: 'bg-primary/10 text-primary border border-primary/20',
  secondary: 'bg-secondary/10 text-secondary border border-secondary/20',
  success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  tertiary: 'bg-tertiary/10 text-tertiary border border-tertiary/20',
  warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  error: 'bg-error/10 text-error border border-error/20',
  neutral: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/15',
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-label-sm px-3 py-1 gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  pulseColor = 'bg-secondary',
  icon,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center font-label-sm rounded-full font-medium shadow-xs transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {pulse && <span className={`w-2 h-2 rounded-full ${pulseColor} animate-pulse shrink-0`} />}
      {icon && (
        <span className="material-symbols-outlined text-sm shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
