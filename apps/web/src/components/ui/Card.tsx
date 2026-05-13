import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ children, className, ...props }: CardProps) => (
  <div
    className={cn(
      'bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...props }: CardProps) => (
  <div className={cn('p-6 pb-0', className)} {...props}>
    {children}
  </div>
);

export const CardContent = ({ children, className, ...props }: CardProps) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }: CardProps) => (
  <div className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
);
