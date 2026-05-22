import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'pill';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  const variants = {
    primary:
      'bg-violet-600 text-white shadow-lg shadow-violet-200/50 hover:bg-violet-700 hover:shadow-violet-300/60 active:scale-[0.98] dark:shadow-violet-900/30',
    secondary:
      'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    danger:
      'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    gradient:
      'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-violet-200/40 hover:shadow-violet-300/60 active:scale-[0.98] dark:shadow-violet-900/30',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
    pill: 'px-5 py-2 text-sm rounded-full',
  };

  return (
    <button
      className={cn(
        'font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
