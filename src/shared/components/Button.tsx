'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'surface' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-container shadow-xs shadow-primary/20 active:scale-[0.98]',
  secondary:
    'bg-secondary text-on-secondary hover:opacity-90 shadow-xs shadow-secondary/20 active:scale-[0.98]',
  surface:
    'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/15 active:scale-[0.98]',
  outline:
    'bg-transparent text-on-surface border border-outline-variant/30 hover:bg-surface-container-high active:scale-[0.98]',
  ghost:
    'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 font-label-sm',
  md: 'px-4 py-2 text-sm rounded-xl gap-2 font-label-md',
  lg: 'px-6 py-3.5 text-base rounded-xl gap-2.5 font-label-md font-semibold',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
      ) : (
        icon &&
        iconPosition === 'left' && (
          <span className="material-symbols-outlined text-lg">{icon}</span>
        )
      )}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined text-lg">{icon}</span>
      )}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  variant?: 'ghost' | 'surface' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  filled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  filled = false,
  className = '',
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'p-1.5 text-lg' : size === 'lg' ? 'p-3 text-2xl' : 'p-2 text-xl';
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-on-primary hover:bg-primary-container shadow-xs'
      : variant === 'surface'
      ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/15'
      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high';

  return (
    <button
      type="button"
      className={`rounded-xl transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      <span
        className="material-symbols-outlined leading-none"
        style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
    </button>
  );
};
