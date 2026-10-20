'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'lowest' | 'low' | 'bordered';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  lowest: 'bg-surface-container-lowest border border-outline-variant/15 shadow-xs',
  low: 'bg-surface-container-low border border-outline-variant/10 shadow-xs',
  bordered: 'bg-surface border border-outline-variant/20',
};

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'lowest',
  hoverable = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl transition-all ${variantClasses[variant]} ${paddingClasses[padding]} ${
        hoverable ? 'hover:shadow-md hover:border-outline-variant/30' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
