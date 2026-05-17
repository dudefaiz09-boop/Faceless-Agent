import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const PageShell = ({ children, maxWidth = 'max-w-7xl', className }: PageShellProps) => (
  <div className={cn('mx-auto space-y-8 pb-12', maxWidth, className)}>{children}</div>
);
