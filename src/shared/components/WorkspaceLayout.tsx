'use client';

import React from 'react';
import { Sidebar } from './Sidebar';

export interface WorkspaceLayoutProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  children: React.ReactNode;
  className?: string;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  user,
  children,
  className = '',
}) => {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar user={user} />
      <div className={`pl-64 ${className}`}>
        {children}
      </div>
    </div>
  );
};
